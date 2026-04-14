import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CachedData {
  patients: any[];
  appointments: any[];
  prescriptions: any[];
  timestamp: number;
}

interface OfflineState {
  cache: CachedData;
  setCache: (data: CachedData) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  pendingChanges: any[];
  addPendingChange: (change: any) => void;
  clearPendingChanges: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      cache: {
        patients: [],
        appointments: [],
        prescriptions: [],
        timestamp: 0,
      },
      setCache: (cache) => set({ cache }),
      isOnline: true,
      setIsOnline: (isOnline) => set({ isOnline }),
      pendingChanges: [],
      addPendingChange: (change) =>
        set((state) => ({
          pendingChanges: [...state.pendingChanges, change],
        })),
      clearPendingChanges: () => set({ pendingChanges: [] }),
    }),
    {
      name: "joan-offline-storage",
    }
  )
);
