export default function PatientPortal() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="Upcoming Appointments" value="2" />
      <Card title="Active Prescriptions" value="4" />
      <Card title="Unread Lab Results" value="1" />
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
