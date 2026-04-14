export default function DepartmentsPage() {
  const departments = [
    { id: 1, name: "Emergency", beds: 20, staffCount: 15, status: "Active" },
    { id: 2, name: "Cardiology", beds: 30, staffCount: 22, status: "Active" },
    { id: 3, name: "ICU", beds: 15, staffCount: 18, status: "Active" },
    { id: 4, name: "Pediatrics", beds: 25, staffCount: 16, status: "Active" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Department Management</h1>

      <div className="mb-6">
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          + Add Department
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Department</th>
              <th className="p-4 text-left">Beds</th>
              <th className="p-4 text-left">Staff</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id} className="border-t hover:bg-gray-50">
                <td className="p-4 font-semibold">{dept.name}</td>
                <td className="p-4">{dept.beds}</td>
                <td className="p-4">{dept.staffCount}</td>
                <td className="p-4">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
                    {dept.status}
                  </span>
                </td>
                <td className="p-4 space-x-2">
                  <button className="text-blue-600 hover:underline">Edit</button>
                  <button className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
