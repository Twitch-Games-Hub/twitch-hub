import { TOAST_TIMEOUT_MS } from '$lib/constants';

export interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
}

let nextId = 0;

function createToastStore() {
  let toasts = $state<ToastItem[]>([]);

  return {
    get toasts() {
      return toasts;
    },

    add(message: string, variant: ToastItem['variant'] = 'info') {
      const id = nextId++;
      toasts = [...toasts, { id, message, variant }];
      setTimeout(() => {
        toasts = toasts.filter((t) => t.id !== id);
      }, TOAST_TIMEOUT_MS);
    },

    dismiss(id: number) {
      toasts = toasts.filter((t) => t.id !== id);
    },
  };
}

export const toastStore = createToastStore();
