export default function StaffPage() {
  const staff = [
    { id: 1, name: "Dr. Smith", role: "Doctor", department: "Cardiology", status: "Active" },
    { id: 2, name: "Nurse Johnson", role: "Nurse", department: "ICU", status: "Active" },
    { id: 3, name: "Lab Tech Sarah", role: "Lab Technician", department: "Lab", status: "On Leave" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Staff Management</h1>

      <div className="mb-6">
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">
          + Add Staff Member
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Department</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-t hover:bg-gray-50">
                <td className="p-4">{member.name}</td>
                <td className="p-4">{member.role}</td>
                <td className="p-4">{member.department}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded text-sm ${member.status === "Active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {member.status}
                  </span>
                </td>
                <td className="p-4 space-x-2">
                  <button className="text-blue-600 hover:underline">Edit</button>
                  <button className="text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
