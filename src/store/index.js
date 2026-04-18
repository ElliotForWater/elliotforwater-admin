import { createStore } from 'vuex';
import VuexPersistence from 'vuex-persist';

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  key: 'elliotforwater-admin',
  reducer: (state) => ({
    currentSection: state.currentSection,
  }),
});

export default createStore({
  state: {
    authState: 'loading', // loading | login | not-registered | admin
    user: null,
    company: null,
    links: [],
    activeNotif: null,
    currentSection: 'branding',
    status: null, // { type: 'success' | 'error', message: string }
  },
  mutations: {
    SET_AUTH_STATE(state, payload) {
      state.authState = payload;
    },
    SET_USER(state, payload) {
      state.user = payload;
    },
    SET_COMPANY(state, payload) {
      state.company = payload;
    },
    SET_LINKS(state, payload) {
      state.links = payload;
    },
    SET_ACTIVE_NOTIF(state, payload) {
      state.activeNotif = payload;
    },
    SET_SECTION(state, payload) {
      state.currentSection = payload;
    },
    SET_STATUS(state, payload) {
      state.status = payload;
    },
    CLEAR_STATUS(state) {
      state.status = null;
    },
  },
  actions: {
    async loadAdmin({ commit }, user) {
      const { supabase } = await import('@/lib/supabase');
      const { getDomain } = await import('@/helpers');

      commit('SET_USER', user);
      const domain = getDomain(user.email);

      const [companyRes, notifRes] = await Promise.all([
        supabase.from('companies').select('*').eq('email_domain', domain).single(),
        supabase
          .from('notifications')
          .select('*')
          .eq('email_domain', domain)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (!companyRes.data) {
        commit('SET_AUTH_STATE', 'not-registered');
        return;
      }

      commit('SET_COMPANY', companyRes.data);
      commit('SET_LINKS', Array.isArray(companyRes.data.default_links) ? companyRes.data.default_links : []);
      commit('SET_ACTIVE_NOTIF', notifRes.data?.[0] || null);
      commit('SET_AUTH_STATE', 'admin');
    },

    showStatus({ commit }, { type, message }) {
      commit('SET_STATUS', { type, message });
      if (type === 'success') {
        setTimeout(() => commit('CLEAR_STATUS'), 6000);
      }
    },
  },
  plugins: [vuexLocal.plugin],
});
