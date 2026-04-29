
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'hospital_admin', 'doctor', 'nurse', 'lab_technician', 'pharmacist', 'accountant', 'receptionist', 'patient', 'guardian');

-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, hospital_id)
);

-- Enable RLS
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND is_active = true
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- Function to check if any super admin exists
CREATE OR REPLACE FUNCTION public.is_first_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin' AND is_active = true
  )
$$;

-- Function to get user hospital
CREATE OR REPLACE FUNCTION public.get_user_hospital(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id FROM public.user_roles
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Hospitals RLS policies
CREATE POLICY "Super admins can manage all hospitals" ON public.hospitals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Hospital admins can view their hospital" ON public.hospitals
  FOR SELECT TO authenticated
  USING (id IN (SELECT hospital_id FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true));

-- User roles RLS policies
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Hospital admins can manage roles in their hospital" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'hospital_admin' AND is_active = true
    )
  );

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow first signup to self-assign super_admin
CREATE POLICY "First user can create super admin role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND role = 'super_admin' AND public.is_first_user()
  );
