export default function QueuePage() {
  const queueItems = [
    { number: "A-101", name: "John Doe", status: "waiting", priority: "normal" },
    { number: "A-102", name: "Jane Smith", status: "in_progress", priority: "urgent" },
    { number: "A-103", name: "Bob Johnson", status: "waiting", priority: "normal" },
    { number: "A-104", name: "Alice Williams", status: "waiting", priority: "emergency" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Queue Management</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Current Queue</h2>
          <div className="space-y-3">
            {queueItems.map((item) => (
              <div
                key={item.number}
                className={`p-4 border-l-4 rounded ${
                  item.priority === "emergency"
                    ? "border-red-600 bg-red-50"
                    : item.priority === "urgent"
                    ? "border-yellow-600 bg-yellow-50"
                    : "border-blue-600 bg-blue-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{item.number}</p>
                    <p className="text-sm">{item.name}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      item.status === "in_progress"
                        ? "bg-green-600 text-white"
                        : "bg-gray-600 text-white"
                    }`}
                  >
                    {item.status === "in_progress" ? "In Progress" : "Waiting"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Queue Statistics</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Total in Queue</p>
              <p className="text-3xl font-bold">4</p>
            </div>
            <div>
              <p className="text-gray-600">Avg Wait Time</p>
              <p className="text-3xl font-bold">12 min</p>
            </div>
            <div>
              <p className="text-gray-600">Completed Today</p>
              <p className="text-3xl font-bold">32</p>
            </div>
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
              Call Next Patient
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Queue Board Display</h2>
        <div className="text-center p-8 bg-gray-100 rounded-lg">
          <p className="text-6xl font-bold text-blue-600">NOW SERVING</p>
          <p className="text-5xl font-bold mt-4">A-102</p>
          <p className="text-2xl mt-4">Jane Smith</p>
          <p className="text-xl text-gray-600 mt-2">ROOM 3</p>
        </div>
      </div>
    </div>
  );
}
