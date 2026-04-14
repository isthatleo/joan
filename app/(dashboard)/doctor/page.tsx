import { useQueueStore } from "@/stores/queue";

export default function DoctorDashboard() {
  const queue = useQueueStore((s) => s.queue);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="border p-4">
        <h3>Queue</h3>
        <ul>
          {queue.map((q) => (
            <li key={q.id}>{q.patientId} - {q.status}</li>
          ))}
        </ul>
        <button>Call Next</button>
      </div>
      <div className="border p-4">
        <h3>Current Patient</h3>
        {/* Patient details */}
      </div>
      <div className="border p-4">
        <h3>AI Copilot</h3>
        {/* AI suggestions */}
      </div>
    </div>
  );
}
