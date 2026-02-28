import type { ApiUser } from '@twitch-hub/shared-types';
import { disconnectAll } from '../socket.js';

interface AuthState {
  user: ApiUser | null;
  loading: boolean;
  error: string | null;
}

function createAuthStore() {
  let state = $state<AuthState>({ user: null, loading: true, error: null });

  return {
    get user() {
      return state.user;
    },
    get loading() {
      return state.loading;
    },
    get error() {
      return state.error;
    },

    setUser(user: ApiUser | null) {
      state.user = user;
      state.loading = false;
    },

    clearError() {
      state.error = null;
    },

    async fetchSession() {
      try {
        state.error = null;
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const user: ApiUser = await res.json();
          state.user = user;
        }
      } catch (err) {
        state.error = err instanceof Error ? err.message : 'Failed to load session';
      } finally {
        state.loading = false;
      }
    },

    logout() {
      disconnectAll();
      state.user = null;
    },
  };
}

export const authStore = createAuthStore();
