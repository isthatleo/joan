"use client";
import { usePrescriptions, useInventory } from "@/hooks/use-queries";

export default function PharmacyPage() {
  const { data: prescriptions } = usePrescriptions();
  const { data: inventory } = useInventory();

  const pending = prescriptions?.filter((p: any) => p.status === "pending").length || 0;
  const lowStock = inventory?.filter((i: any) => parseInt(i.stock) < 10).length || 0;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Pharmacy</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Pending Prescriptions</p>
          <h2 className="text-2xl font-bold">{pending}</h2>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Low Stock Items</p>
          <h2 className="text-2xl font-bold">{lowStock}</h2>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Total Inventory</p>
          <h2 className="text-2xl font-bold">{inventory?.length || 0}</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Prescriptions</h2>
          <div className="space-y-2">
            {prescriptions?.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-2 border-b">
                <span>{p.id}</span>
                <span className="text-sm text-gray-600">{p.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Inventory</h2>
          <div className="space-y-2">
            {inventory?.slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex justify-between items-center p-2 border-b">
                <span>{item.name}</span>
                <span className={`text-sm ${parseInt(item.stock) < 10 ? "text-red-600" : "text-green-600"}`}>
                  {item.stock} units
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
