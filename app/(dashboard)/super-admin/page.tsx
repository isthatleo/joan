export default function SuperAdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Platform Control Center</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card title="Total Hospitals" value="12" trend="+2" />
        <Card title="Active Patients" value="4,230" trend="+120" />
        <Card title="Daily Transactions" value="$45,320" trend="+15%" />
        <Card title="System Health" value="99.8%" trend="✓" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Hospital Tiers</h2>
          <div className="space-y-3">
            {["Premium", "Standard", "Basic"].map((tier) => (
              <div key={tier} className="flex justify-between items-center p-3 border rounded">
                <span className="font-semibold">{tier}</span>
                <span className="text-gray-600">{Math.floor(Math.random() * 8) + 1} hospitals</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Service Status</h2>
          <div className="space-y-3">
            {["Auth Service", "Database", "Cache", "API Gateway"].map((service) => (
              <div key={service} className="flex justify-between items-center p-3 border rounded">
                <span>{service}</span>
                <span className="text-green-600">✓ Healthy</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Revenue</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600">Monthly</p>
            <p className="text-2xl font-bold">$1,234,560</p>
          </div>
          <div>
            <p className="text-gray-600">YTD</p>
            <p className="text-2xl font-bold">$9,876,543</p>
          </div>
          <div>
            <p className="text-gray-600">Growth</p>
            <p className="text-2xl font-bold text-green-600">+23%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  trend,
}: {
  title: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-600">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
      <p className="text-sm text-green-600 mt-2">{trend}</p>
    </div>
  );
}
