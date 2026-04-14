// Documentation for Joan Healthcare OS
export default function DocumentationPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-8">Joan Healthcare OS - Documentation</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <p className="text-gray-700 mb-4">
            Joan is a comprehensive multi-tenant healthcare operating system designed for hospitals,
            clinics, labs, and insurance providers. It provides real-time queue management, EMR/EHR,
            billing, pharmacy, lab services, and AI-powered clinical assistance.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Architecture</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Frontend:</strong> Next.js 14 with React, Zustand, React Query</li>
            <li><strong>Backend:</strong> Node.js API with tRPC, Express/Fastify</li>
            <li><strong>Database:</strong> PostgreSQL + Drizzle ORM</li>
            <li><strong>Cache:</strong> Redis for queues and realtime</li>
            <li><strong>Realtime:</strong> Socket.io for WebSockets</li>
            <li><strong>Auth:</strong> Better-auth with custom RBAC</li>
            <li><strong>AI:</strong> OpenAI GPT-4 for clinical assistance</li>
            <li><strong>Notifications:</strong> Twilio for SMS/WhatsApp</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Core Modules</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Patient Management</h3>
              <p className="text-sm text-gray-600">Global patient ID, cross-hospital tracking, medical timeline</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Appointments & Queue</h3>
              <p className="text-sm text-gray-600">Realtime queue, priority management, live tracking</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">EMR/EHR</h3>
              <p className="text-sm text-gray-600">Visit notes, diagnoses, vitals, lab results, prescriptions</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Pharmacy</h3>
              <p className="text-sm text-gray-600">Inventory, prescription tracking, expiry management</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Billing & Insurance</h3>
              <p className="text-sm text-gray-600">Invoices, payment tracking, claims processing</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">AI Copilot</h3>
              <p className="text-sm text-gray-600">Diagnosis suggestions, drug interactions, clinical insights</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">User Roles</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Super Admin - Platform control</li>
            <li>Hospital Admin - Tenant management</li>
            <li>Doctor - Patient care, diagnostics</li>
            <li>Nurse - Vitals, medication, care</li>
            <li>Lab Technician - Test ordering, results</li>
            <li>Pharmacist - Prescription fulfillment</li>
            <li>Receptionist - Appointments, check-in</li>
            <li>Accountant - Billing, payments</li>
            <li>Patient - Medical records, appointments</li>
            <li>Guardian - Family health oversight</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">API Integration</h2>
          <div className="bg-gray-100 p-4 rounded-lg text-sm font-mono">
            <p>POST /api/patients - Create patient</p>
            <p>POST /api/appointments - Book appointment</p>
            <p>POST /api/visits - Create visit</p>
            <p>POST /api/lab/orders - Order lab test</p>
            <p>POST /api/pharmacy/prescriptions - Write prescription</p>
            <p>POST /api/billing/invoices - Create invoice</p>
            <p>POST /api/queue/add - Add to queue</p>
            <p>GET /api/ai/summary/:id - AI summary</p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Feature Highlights</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>✓ Multi-tenant architecture</li>
            <li>✓ Real-time queue management</li>
            <li>✓ Advanced RBAC with scopes</li>
            <li>✓ Comprehensive audit logging</li>
            <li>✓ AI-powered clinical assistance</li>
            <li>✓ Offline-first capabilities</li>
            <li>✓ Mobile app support</li>
            <li>✓ SMS/WhatsApp notifications</li>
            <li>✓ Insurance claims integration</li>
            <li>✓ HIPAA/GDPR compliance</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
            <p>1. npm install</p>
            <p>2. npm run db:push (migrate database)</p>
            <p>3. npm run dev (start development server)</p>
            <p>4. Open http://localhost:3000</p>
          </div>
        </section>
      </div>
    </div>
  );
}
