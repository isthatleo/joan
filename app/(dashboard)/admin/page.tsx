"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");

  useEffect(() => {
    if (appointmentId) {
      // Logic to open appointment details
    }
  }, [appointmentId]);

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Total Hospitals" value="5" />
      <Card title="Active Patients" value="1200" />
      <Card title="Daily Transactions" value="150" />
      <Card title="System Health" value="98%" />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <p className="text-sm text-muted">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}
