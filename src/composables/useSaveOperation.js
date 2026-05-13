import { ref } from 'vue';
import { useStore } from 'vuex';
import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/services/errorHandler';

export function useSaveOperation() {
  const store = useStore();
  const saving = ref(false);

  const save = async (operation) => {
    // Validate session before every critical operation
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      store.dispatch('showStatus', { type: 'error', message: 'Your session has expired. Please sign in again.' });
      store.commit('SET_AUTH_STATE', 'login');
      return;
    }

    saving.value = true;
    try {
      await operation();
    } catch (e) {
      const { userMessage } = ErrorHandler.handle(e, { operation: 'save' });
      store.dispatch('showStatus', { type: 'error', message: userMessage });
    } finally {
      saving.value = false;
    }
  };

  return { saving, save };
}
