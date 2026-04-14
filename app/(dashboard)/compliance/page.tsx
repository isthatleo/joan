export default function CompliancePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Compliance & Audit</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">HIPAA/GDPR Compliance</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 border rounded">
              <span>Encryption Status</span>
              <span className="text-green-600 font-semibold">✓ Enabled</span>
            </div>
            <div className="flex justify-between items-center p-3 border rounded">
              <span>Data Retention Policy</span>
              <span className="text-green-600 font-semibold">✓ Configured</span>
            </div>
            <div className="flex justify-between items-center p-3 border rounded">
              <span>Access Controls</span>
              <span className="text-green-600 font-semibold">✓ Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Audit Logs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Timestamp</th>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Resource</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3">2026-04-15 10:30:00</td>
                  <td className="p-3">Dr. Smith</td>
                  <td className="p-3">viewed</td>
                  <td className="p-3">Patient #1234</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3">2026-04-15 10:25:00</td>
                  <td className="p-3">Nurse Johnson</td>
                  <td className="p-3">updated</td>
                  <td className="p-3">Vitals #5678</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
