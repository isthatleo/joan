"use client";
import { useLabOrders } from "@/hooks/use-queries";

export default function LabPage() {
  const { data: orders, isLoading } = useLabOrders();

  if (isLoading) return <div>Loading...</div>;

  const pending = orders?.filter((o: any) => o.status === "pending").length || 0;
  const completed = orders?.filter((o: any) => o.status === "completed").length || 0;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Lab Orders</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Pending Orders</p>
          <h2 className="text-2xl font-bold">{pending}</h2>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Completed Today</p>
          <h2 className="text-2xl font-bold">{completed}</h2>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Total Orders</p>
          <h2 className="text-2xl font-bold">{orders?.length || 0}</h2>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Order ID</th>
              <th className="p-4 text-left">Visit</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order: any) => (
              <tr key={order.id} className="border-t">
                <td className="p-4">{order.id}</td>
                <td className="p-4">{order.visitId}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded ${order.status === "completed" ? "bg-green-100" : "bg-blue-100"}`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-4">
                  <button className="text-blue-600 hover:underline">View Results</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
