import { getUid } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type Mode = 'customer' | 'helper';
export type Vehicle = 'none' | 'car' | 'truck';
export type Availability = 'online' | 'schedule';

export const HELPER_CATEGORIES = [
  'Moving',
  'Yard work',
  'Events',
  'Errands',
  'Seasonal',
];

export const RADIUS_CHOICES = [5, 10, 15, 25, 50];

export const VEHICLE_LABELS: Record<Vehicle, string> = {
  none: 'No vehicle',
  car: 'Car',
  truck: 'Truck or van',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  online: 'Whenever I go online',
  schedule: 'On a set schedule',
};

export type Profile = {
  user_id: string;
  first_name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  mode: Mode;
  helper_categories: string[];
  helper_city: string | null;
  helper_vehicle: Vehicle;
  helper_radius_miles: number;
  helper_availability: Availability;
  helper_alerts: boolean;
  onboarding_completed: boolean;
  helper_onboarded_at: string | null;
};

export async function loadProfile(): Promise<Profile | null> {
  const uid = getUid();
  if (!uid) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();

  if (error) {
    console.error('Failed to load profile:', error);
    throw error;
  }

  return data as Profile | null;
}

export async function setMode(mode: Mode): Promise<void> {
  const uid = getUid();
  if (!uid) throw new Error('Not signed in');

  const { error } = await supabase
    .from('profiles')
    .update({ mode })
    .eq('user_id', uid);

  if (error) throw error;
}

export async function setHelperAlerts(alerts: boolean): Promise<void> {
  const uid = getUid();
  if (!uid) throw new Error('Not signed in');

  const { error } = await supabase
    .from('profiles')
    .update({ helper_alerts: alerts })
    .eq('user_id', uid);

  if (error) throw error;
}

export async function saveHelperSignup(fields: {
  first_name: string;
  helper_categories: string[];
  helper_vehicle: Vehicle;
  helper_city: string;
  helper_radius_miles: number;
  helper_availability: Availability;
  helper_alerts: boolean;
}): Promise<void> {
  const uid = getUid();
  if (!uid) throw new Error('Not signed in');

  const { error } = await supabase
    .from('profiles')
    .update({
      ...fields,
      mode: 'helper',
      onboarding_completed: true,
      helper_onboarded_at: new Date().toISOString(),
    })
    .eq('user_id', uid);

  if (error) throw error;
}