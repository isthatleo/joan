export default function RoleManagementPage() {
  const roles = [
    { name: "Super Admin", permissions: 100 },
    { name: "Hospital Admin", permissions: 45 },
    { name: "Doctor", permissions: 28 },
    { name: "Nurse", permissions: 18 },
    { name: "Lab Tech", permissions: 12 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Role Management</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Permissions</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.name} className="border-t">
                <td className="p-4">{role.name}</td>
                <td className="p-4">{role.permissions} permissions</td>
                <td className="p-4 space-x-2">
                  <button className="text-blue-600 hover:underline">Edit</button>
                  <button className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          Create New Role
        </button>
      </div>
    </div>
  );
}
