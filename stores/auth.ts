import { create } from "zustand";

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthState {
  user: User | null;
  permissions: Map<string, string>;
  setUser: (user: User | null) => void;
  setPermissions: (permissions: Map<string, string>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  permissions: new Map(),
  setUser: (user) => set({ user }),
  setPermissions: (permissions) => set({ permissions }),
}));
