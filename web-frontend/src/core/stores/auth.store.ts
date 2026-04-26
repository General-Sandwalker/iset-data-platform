import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  cin: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'responsable_observatoire' | 'enseignant' | 'etudiant' | 'alumni';
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'iset-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);