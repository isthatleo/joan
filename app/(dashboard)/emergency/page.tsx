export default function EmergencyModePage() {
  return (
    <div className="h-screen bg-red-50 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-red-600 mb-4">EMERGENCY MODE</h1>
          <p className="text-xl text-gray-600">Fast-track patient intake - no friction</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-lg font-semibold">Patient Name</span>
              <input
                type="text"
                className="w-full mt-2 border rounded-lg px-4 py-3 text-lg"
                placeholder="Enter name"
              />
            </label>

            <label className="block">
              <span className="text-lg font-semibold">Critical Symptoms</span>
              <textarea
                className="w-full mt-2 border rounded-lg px-4 py-3"
                rows={4}
                placeholder="List critical symptoms..."
              />
            </label>

            <label className="block">
              <span className="text-lg font-semibold">Priority</span>
              <select className="w-full mt-2 border rounded-lg px-4 py-3">
                <option>CRITICAL</option>
                <option>EMERGENCY</option>
                <option>URGENT</option>
              </select>
            </label>
          </div>

          <button className="w-full bg-red-600 text-white py-4 rounded-lg text-lg font-bold hover:bg-red-700">
            ⚠ ADMIT IMMEDIATELY
          </button>

          <div className="bg-red-100 border border-red-600 p-4 rounded">
            <p className="text-red-900">
              ✓ Priority queue override active
              <br />✓ Bypass registration
              <br />✓ Direct to triage
            </p>
          </div>
        </div>

        <div className="text-center">
          <button className="text-blue-600 hover:underline text-sm">
            Back to normal mode
          </button>
        </div>
      </div>
    </div>
  );
}
