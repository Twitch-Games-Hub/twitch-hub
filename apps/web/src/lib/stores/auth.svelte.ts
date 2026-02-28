import type { ApiUser } from '@twitch-hub/shared-types';

interface AuthState {
  user: ApiUser | null;
  loading: boolean;
}

function createAuthStore() {
  let state = $state<AuthState>({ user: null, loading: true });

  return {
    get user() { return state.user; },
    get loading() { return state.loading; },

    setUser(user: ApiUser | null) {
      state.user = user;
      state.loading = false;
    },

    async fetchSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const user: ApiUser = await res.json();
          state.user = user;
        }
      } catch {
        // not logged in
      } finally {
        state.loading = false;
      }
    },

    logout() {
      state.user = null;
    },
  };
}

export const authStore = createAuthStore();
