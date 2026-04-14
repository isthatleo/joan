export default function LabTechnicianDashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Tests Pending" value="15" />
      <Card title="In Progress" value="5" />
      <Card title="Completed Today" value="42" />
      <Card title="Avg Turnaround" value="2h 30m" />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <p className="text-sm text-muted">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}
