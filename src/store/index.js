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

      const { data: profile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('email_domain', domain)
        .maybeSingle();

      if (!profile) {
        commit('SET_AUTH_STATE', 'not-registered');
        return;
      }

      const { data: config } = await supabase
        .from('company_configs')
        .select('*')
        .eq('company_id', profile.id)
        .maybeSingle();

      const company = { ...profile, ...config };
      commit('SET_COMPANY', company);
      commit('SET_LINKS', Array.isArray(company.default_links) ? company.default_links : []);
      commit('SET_ACTIVE_NOTIF', company.notifications?.active ? company.notifications : null);
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
