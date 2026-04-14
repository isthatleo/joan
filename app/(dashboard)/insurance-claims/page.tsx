export default function InsuranceClaimsPage() {
  const claims = [
    { id: "CLM001", invoice: "INV-001", status: "Approved", amount: "$2,500", submittedDate: "2026-04-10" },
    { id: "CLM002", invoice: "INV-002", status: "Pending", amount: "$3,200", submittedDate: "2026-04-12" },
    { id: "CLM003", invoice: "INV-003", status: "Rejected", amount: "$1,800", submittedDate: "2026-04-08" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Insurance Claims</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card title="Submitted" value="45" />
        <Card title="Approved" value="38" />
        <Card title="Pending" value="5" />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Claim ID</th>
              <th className="p-4 text-left">Invoice</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Submitted</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id} className="border-t hover:bg-gray-50">
                <td className="p-4 font-semibold">{claim.id}</td>
                <td className="p-4">{claim.invoice}</td>
                <td className="p-4">{claim.amount}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded text-sm ${
                    claim.status === "Approved"
                      ? "bg-green-100 text-green-800"
                      : claim.status === "Pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {claim.status}
                  </span>
                </td>
                <td className="p-4">{claim.submittedDate}</td>
                <td className="p-4">
                  <button className="text-blue-600 hover:underline">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-600">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}
