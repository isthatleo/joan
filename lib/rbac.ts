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
 * Where each role lands after login. We use "/" because every dashboard
 * is rendered under (dashboard)/page.tsx which switches on the user's role.
 * Sub-routes are then navigated to from the sidebar.
 */
export const ROLE_HOME: Record<AppRole, string> = {
  super_admin: "/",
  hospital_admin: "/",
  doctor: "/",
  nurse: "/",
  lab_technician: "/",
  pharmacist: "/",
  accountant: "/",
  receptionist: "/",
  patient: "/",
  guardian: "/",
};

export const PUBLIC_ROUTES = ["/login", "/master", "/signup"];
