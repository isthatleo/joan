export default function AccountantDashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Revenue Today" value="$5,240" />
      <Card title="Outstanding Payments" value="$12,850" />
      <Card title="Insurance Claims Pending" value="18" />
      <Card title="Payment Methods" value="4" />
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
