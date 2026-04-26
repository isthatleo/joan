import { create } from "zustand";

export type AppRole = 
  | "super_admin"
  | "hospital_admin"
  | "doctor"
  | "nurse"
  | "lab_technician"
  | "pharmacist"
  | "accountant"
  | "receptionist"
  | "patient"
  | "guardian";

interface User {
  id: string;
  email: string;
  fullName: string;
  role?: AppRole;
  hospitalId?: string;
  hospitalName?: string;
}

interface AuthState {
  user: User | null;
  permissions: Map<string, string>;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setPermissions: (permissions: Map<string, string>) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  permissions: new Map(),
  isLoading: true,
  setUser: (user) => set({ user }),
  setPermissions: (permissions) => set({ permissions }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, permissions: new Map(), isLoading: false }),
}));
