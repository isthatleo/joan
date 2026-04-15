"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { KPICard } from "@/components/KPICard";
import { DataCard, DataCardItem } from "@/components/DataCard";
import { Users, FileText, Clock, AlertCircle, Save, Plus, Heart } from "lucide-react";

export default function DoctorConsultationPage() {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [consultation, setConsultation] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
    prescription: "",
  });

  const mockPatients: DataCardItem[] = [
    {
      id: "1",
      title: "John Doe",
      subtitle: "Age: 45 | Blood Type: O+",
      status: "normal",
      value: "In Consultation",
    },
    {
      id: "2",
      title: "Jane Smith",
      subtitle: "Age: 32 | Blood Type: A-",
      status: "normal",
      value: "Waiting",
    },
  ];

  return (
    <div className="space-y-6">
      <Topbar
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Consultation" },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Patient Consultation
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Clinical workspace for patient consultations
        </p>
      </div>

      {/* Main Consultation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection */}
        <div className="lg:col-span-1">
          <DataCard
            title="Today's Patients"
            items={mockPatients}
            onItemClick={(patient) => setSelectedPatient(patient.id)}
          />
        </div>

        {/* Consultation Form */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <>
              {/* Patient Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Age", value: "45", icon: "👤" },
                    { label: "BP", value: "120/80", icon: "❤️" },
                    { label: "HR", value: "72", icon: "💓" },
                    { label: "Temp", value: "98.6°F", icon: "🌡️" },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg"
                    >
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {stat.label}
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consultation Form */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Chief Complaint / Symptoms
                  </label>
                  <textarea
                    value={consultation.symptoms}
                    onChange={(e) =>
                      setConsultation({ ...consultation, symptoms: e.target.value })
                    }
                    placeholder="Patient's presenting symptoms..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Diagnosis
                  </label>
                  <textarea
                    value={consultation.diagnosis}
                    onChange={(e) =>
                      setConsultation({ ...consultation, diagnosis: e.target.value })
                    }
                    placeholder="Clinical diagnosis..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Clinical Notes
                  </label>
                  <textarea
                    value={consultation.notes}
                    onChange={(e) =>
                      setConsultation({ ...consultation, notes: e.target.value })
                    }
                    placeholder="Additional clinical notes..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Prescription
                  </label>
                  <textarea
                    value={consultation.prescription}
                    onChange={(e) =>
                      setConsultation({ ...consultation, prescription: e.target.value })
                    }
                    placeholder="Medication & dosage..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
                  <Save className="w-5 h-5" />
                  Save Consultation
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-gray-200 dark:border-slate-700 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Select a patient to start consultation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Reference Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Patient Allergies & Conditions
          </h3>
          <div className="space-y-2">
            {[
              { label: "Allergies", items: ["Penicillin", "Peanuts"] },
              {
                label: "Chronic Conditions",
                items: ["Hypertension", "Type 2 Diabetes"],
              },
              { label: "Current Medications", items: ["Metformin", "Lisinopril"] },
            ].map((category, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {category.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {category.items.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Lab Results
          </h3>
          <div className="space-y-2">
            {[
              { test: "CBC", date: "2 days ago", status: "Normal" },
              { test: "Blood Glucose", date: "1 week ago", status: "Normal" },
              { test: "Lipid Panel", date: "2 weeks ago", status: "High" },
            ].map((result, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {result.test}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {result.date}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    result.status === "High"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {result.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

