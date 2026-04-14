import { create } from "zustand";
import { socket } from "@/lib/socket";

interface QueueItem {
  id: string;
  patientId: string;
  status: string;
  priority: string;
}

interface QueueState {
  queue: QueueItem[];
  setQueue: (queue: QueueItem[]) => void;
  updateQueueItem: (item: QueueItem) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  queue: [],
  setQueue: (queue) => set({ queue }),
  updateQueueItem: (item) =>
    set((state) => ({
      queue: state.queue.map((q) => (q.id === item.id ? item : q)),
    })),
}));

// Realtime sync
socket.on("queue.updated", (data) => {
  useQueueStore.getState().updateQueueItem(data);
});

socket.on("queue.called", ({ id }) => {
  // Handle call next
});
