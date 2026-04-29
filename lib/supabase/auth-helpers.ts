import { supabase } from "./client";
import type { AppRole } from "@/stores/auth";

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUserRole(userId: string, email?: string): Promise<AppRole | null> {
  try {
    const response = await fetch("/api/auth/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, email }),
    });
    const data = await response.json();
    return data.role || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

export async function getUserHospital(userId: string): Promise<string | null> {
  // For now, return null or implement if needed
  return null;
}

export async function isFirstUser(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/first-user");
    const data = await response.json();
    return data.isFirst || false;
  } catch (error) {
    console.error("Error checking first user:", error);
    return false;
  }
}

export async function assignRole(userId: string, roleName: AppRole, tenantId?: string) {
  try {
    const response = await fetch("/api/auth/assign-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roleName }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to assign role");
    }
    return { success: true };
  } catch (error) {
    console.error("Error assigning role:", error);
    throw error;
  }
}

export async function getHospitals() {
  const { data, error } = await supabase
    .from("hospitals")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function createHospital(name: string, slug: string, address?: string, phone?: string, email?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("hospitals").insert({
    name,
    slug,
    address,
    phone,
    email,
    created_by: user?.id,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getHospitalStaff(hospitalId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*, hospitals(*)")
    .eq("hospital_id", hospitalId)
    .eq("is_active", true);
  if (error) throw error;
  return data || [];
}
