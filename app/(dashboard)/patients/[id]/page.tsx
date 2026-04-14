"use client";
import { usePatients } from "@/hooks/use-queries";
import Link from "next/link";

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // In real app, fetch specific patient
  const { data: patients } = usePatients();
  const patient = patients?.find((p: any) => p.id === params.id);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Patient Profile</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <nav className="space-y-2">
          <Link href="#overview" className="block px-4 py-2 bg-blue-600 text-white rounded">
            Overview
          </Link>
          <Link href="#history" className="block px-4 py-2 hover:bg-gray-100 rounded">
            Medical History
          </Link>
          <Link href="#visits" className="block px-4 py-2 hover:bg-gray-100 rounded">
            Visits
          </Link>
          <Link href="#results" className="block px-4 py-2 hover:bg-gray-100 rounded">
            Lab Results
          </Link>
          <Link href="#prescriptions" className="block px-4 py-2 hover:bg-gray-100 rounded">
            Prescriptions
          </Link>
          <Link href="#billing" className="block px-4 py-2 hover:bg-gray-100 rounded">
            Billing
          </Link>
        </nav>

        <div className="col-span-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">{patient?.firstName} {patient?.lastName}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Date of Birth</p>
                <p className="font-semibold">{patient?.dob}</p>
              </div>
              <div>
                <p className="text-gray-600">Gender</p>
                <p className="font-semibold">{patient?.gender}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone</p>
                <p className="font-semibold">{patient?.phone}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-semibold">{patient?.email}</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-bold mb-3">Allergies</h3>
              <p className="text-gray-600">No known allergies</p>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-bold mb-3">Current Conditions</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Hypertension</li>
                <li>Diabetes Type 2</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
