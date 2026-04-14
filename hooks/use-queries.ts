import { useQuery, useMutation } from "@tanstack/react-query";

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: () => fetch("/api/patients").then((r) => r.json()),
  });
}

export function useCreatePatient() {
  return useMutation({
    mutationFn: (data: any) =>
      fetch("/api/patients", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((r) => r.json()),
  });
}

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: () => fetch("/api/appointments").then((r) => r.json()),
  });
}

export function useCreateAppointment() {
  return useMutation({
    mutationFn: (data: any) =>
      fetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((r) => r.json()),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => fetch("/api/billing/invoices").then((r) => r.json()),
  });
}

export function useLabOrders() {
  return useQuery({
    queryKey: ["lab-orders"],
    queryFn: () => fetch("/api/lab/orders").then((r) => r.json()),
  });
}

export function usePrescriptions() {
  return useQuery({
    queryKey: ["prescriptions"],
    queryFn: () => fetch("/api/pharmacy/prescriptions").then((r) => r.json()),
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetch("/api/pharmacy/inventory").then((r) => r.json()),
  });
}
