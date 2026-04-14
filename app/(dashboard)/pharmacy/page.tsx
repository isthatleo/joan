export default function PharmacistDashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Prescriptions Pending" value="28" />
      <Card title="Inventory Alerts" value="7" />
      <Card title="Expiring Drugs" value="3" />
      <Card title="Dispensed Today" value="156" />
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
