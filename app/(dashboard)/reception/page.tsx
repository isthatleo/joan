export default function ReceptionistDashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Appointments Today" value="34" />
      <Card title="Walk-ins" value="8" />
      <Card title="Queue Status" value="Active" />
      <Card title="Check-ins Done" value="22" />
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
