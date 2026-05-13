import { createStore } from 'vuex';
import VuexPersistence from 'vuex-persist';

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  key: 'elliotforwater-admin',
  reducer: (state) => ({
    currentSection: state.currentSection,
    session: state.session,
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
    session: {
      startedAt: null,       // timestamp when session began
      fingerprint: null,     // browser fingerprint at login
      events: [],            // in-session event log (not persisted)
    },
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
    SET_SESSION(state, payload) {
      state.session = { ...state.session, ...payload };
    },
    LOG_SESSION_EVENT(state, event) {
      state.session.events = [...(state.session.events || []).slice(-49), event];
    },
    CLEAR_SESSION(state) {
      state.session = { startedAt: null, fingerprint: null, events: [] };
    },
  },
  actions: {
    async loadAdmin({ commit }, user) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { getDomain } = await import('@/helpers');
        const { setAuditContext, auditLog, AUDIT_EVENTS } = await import('@/services/auditService');

        commit('SET_USER', user);
        const domain = getDomain(user.email);

        const { data: profile, error: profileError } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('email_domain', domain)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile) {
          commit('SET_AUTH_STATE', 'not-registered');
          return;
        }

        if (profile.admin_email && profile.admin_email !== user.email) {
          commit('SET_AUTH_STATE', 'not-authorized');
          await auditLog(AUDIT_EVENTS.PERMISSION_DENIED, { email: user.email, domain });
          return;
        }

        const { data: config, error: configError } = await supabase
          .from('company_configs')
          .select('*')
          .eq('company_id', profile.id)
          .maybeSingle();

        if (configError) throw configError;

        const company = { ...profile, ...config, id: profile.id };
        commit('SET_COMPANY', company);
        commit('SET_LINKS', Array.isArray(company.default_links) ? company.default_links : []);
        commit('SET_ACTIVE_NOTIF', company.notifications?.active ? company.notifications : null);
        commit('SET_AUTH_STATE', 'admin');

        setAuditContext(user.id, profile.id);
        await auditLog(AUDIT_EVENTS.USER_LOGIN, { email: user.email, domain });
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.warn('[loadAdmin]', e);
        commit('SET_STATUS', { type: 'error', message: 'Could not load your admin data. Please refresh and try again.' });
        commit('SET_AUTH_STATE', 'login');
      }
    },

    showStatus({ commit }, { type, message }) {
      commit('SET_STATUS', { type, message });
      if (type === 'success') {
        setTimeout(() => commit('CLEAR_STATUS'), 6000);
      }
    },

    startSession({ commit }) {
      const fingerprint = generateFingerprint();
      commit('SET_SESSION', { startedAt: Date.now(), fingerprint, events: [] });
      commit('LOG_SESSION_EVENT', sessionEvent('SESSION_STARTED'));
    },

    logSessionEvent({ commit }, { type, meta }) {
      commit('LOG_SESSION_EVENT', sessionEvent(type, meta));
    },

    endSession({ commit }, reason = 'manual') {
      commit('LOG_SESSION_EVENT', sessionEvent('SESSION_ENDED', { reason }));
      commit('CLEAR_SESSION');
      commit('SET_USER', null);
      commit('SET_COMPANY', null);
      commit('SET_LINKS', []);
      commit('SET_ACTIVE_NOTIF', null);
    },
  },
  plugins: [vuexLocal.plugin],
});

function generateFingerprint() {
  try {
    return btoa([
      navigator.userAgent,
      `${screen.width}x${screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
    ].join('|'));
  } catch {
    return 'unknown';
  }
}

function sessionEvent(type, meta = {}) {
  return { type, ts: new Date().toISOString(), ...meta };
}
