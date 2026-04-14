"use client";
import { useInvoices } from "@/hooks/use-queries";

export default function BillingPage() {
  const { data: invoices, isLoading } = useInvoices();

  if (isLoading) return <div>Loading...</div>;

  const totalRevenue = invoices?.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0) || 0;
  const outstanding = invoices?.filter((inv: any) => inv.status !== "paid").length || 0;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Billing</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Total Revenue</p>
          <h2 className="text-2xl font-bold">${totalRevenue.toFixed(2)}</h2>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Outstanding</p>
          <h2 className="text-2xl font-bold">{outstanding}</h2>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Invoices</p>
          <h2 className="text-2xl font-bold">{invoices?.length || 0}</h2>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Invoice ID</th>
              <th className="p-4 text-left">Patient</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices?.map((inv: any) => (
              <tr key={inv.id} className="border-t">
                <td className="p-4">{inv.id}</td>
                <td className="p-4">{inv.patientId}</td>
                <td className="p-4">${parseFloat(inv.totalAmount || 0).toFixed(2)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded ${inv.status === "paid" ? "bg-green-100" : "bg-yellow-100"}`}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
