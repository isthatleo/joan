export default function NurseDashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Assigned Patients" value="8" />
      <Card title="Vitals Due" value="3" />
      <Card title="Medication Schedule" value="12" />
      <Card title="Alerts" value="2" />
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
