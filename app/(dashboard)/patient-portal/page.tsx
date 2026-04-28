export default function PatientPortal() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Patient Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Access your health records and manage appointments
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Upcoming Appointments" value="2" href="/patient-portal/appointments" />
        <Card title="Active Prescriptions" value="4" href="/patient-portal/prescriptions" />
        <Card title="Unread Lab Results" value="1" href="/patient-portal/results" />
        <Card title="Medical Records" value="12" href="/patient-portal/records" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/patient-portal/appointments'}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">+</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Schedule Appointment</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Book with your doctor</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/messages'}
            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm">💬</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Message Doctor</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send secure messages</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/patient-portal/results'}
            className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 text-sm">📊</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">View Results</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Check lab results</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/patient-portal/records'}
            className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <span className="text-orange-600 dark:text-orange-400 text-sm">📁</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Medical Records</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Access your history</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, href }: { title: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm text-muted">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}
