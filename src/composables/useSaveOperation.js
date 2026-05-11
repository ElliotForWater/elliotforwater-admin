import { ref } from 'vue';
import { useStore } from 'vuex';
import { supabase } from '@/lib/supabase';

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
      store.dispatch('showStatus', { type: 'error', message: 'Failed: ' + e.message });
    } finally {
      saving.value = false;
    }
  };

  return { saving, save };
}
