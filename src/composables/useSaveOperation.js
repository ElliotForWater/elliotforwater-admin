import { ref } from 'vue';
import { useStore } from 'vuex';

export function useSaveOperation() {
  const store = useStore();
  const saving = ref(false);

  const save = async (operation) => {
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
