/**
 * Joan Healthcare OS — RBAC roles & default landing routes.
 * Single source of truth used by Sidebar, AuthProvider and login flows.
 */

export type AppRole =
  | "super_admin"
  | "hospital_admin"
  | "doctor"
  | "nurse"
  | "lab_technician"
  | "pharmacist"
  | "accountant"
  | "receptionist"
  | "patient"
  | "guardian";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  hospital_admin: "Hospital Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  lab_technician: "Lab Technician",
  pharmacist: "Pharmacist",
  accountant: "Accountant",
  receptionist: "Receptionist",
  patient: "Patient",
  guardian: "Guardian",
};

/**
 * Where each role lands after login. Each role has a dedicated dashboard
 * route under the (dashboard) group; sub-routes are reached from the sidebar.
 */
export const ROLE_HOME: Record<AppRole, string> = {
  super_admin: "/super-admin",
  hospital_admin: "/admin",
  doctor: "/doctor",
  nurse: "/nurse",
  lab_technician: "/lab-technician",
  pharmacist: "/pharmacist",
  accountant: "/accountant",
  receptionist: "/reception",
  patient: "/patient",
  guardian: "/guardian",
};

export const PUBLIC_ROUTES = ["/login", "/master", "/signup"];
