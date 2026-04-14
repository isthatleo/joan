import { create } from "zustand";

interface Child {
  id: string;
  name: string;
}

interface FamilyState {
  children: Child[];
  activeChildId: string | null;
  setChildren: (children: Child[]) => void;
  setActiveChild: (id: string | null) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  children: [],
  activeChildId: null,
  setChildren: (children) => set({ children }),
  setActiveChild: (activeChildId) => set({ activeChildId }),
}));
