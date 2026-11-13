// Each person's profile: their first name, whether they're hiring or helping right now,
// and their helper settings. Saved in the Supabase "profiles" table, one row per user.
// The table is created by supabase/migrations/001_profiles.sql.
import { supabase } from '@/lib/supabase';
import { getUid } from '@/lib/auth';

export type Mode = 'customer' | 'helper';
export type Vehicle = 'none' | 'car' | 'truck';
export type Availability = 'online' | 'schedule';

export type Profile = {
  user_id: string;
  first_name: string | null;
  mode: Mode;
  helper_onboarded_at: string | null;
  helper_categories: string[];
  helper_vehicle: Vehicle | null;
  helper_city: string | null;
  helper_radius_miles: number;
  helper_availability: Availability;
  helper_alerts: boolean;
  created_at: string;
  updated_at: string;
};

// What the helper sign-up collects.
export type HelperSignup = {
  first_name: string;
  helper_categories: string[];
  helper_vehicle: Vehicle;
  helper_city: string;
  helper_radius_miles: number;
  helper_availability: Availability;
  helper_alerts: boolean;
};

// The same names customers pick on the Home screen, so gigs can be matched to helpers later.
export const HELPER_CATEGORIES = ['Moving', 'Yard work', 'Events', 'Errands'] as const;

export const RADIUS_CHOICES = [5, 10, 15, 20, 25, 30] as const;

export const VEHICLE_LABELS: Record<Vehicle, string> = {
  none: 'No vehicle',
  car: 'Car',
  truck: 'Truck or van',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  online: 'When I’m online',
  schedule: 'On a set schedule',
};

function requireUid(): string {
  const uid = getUid();
  if (!uid) throw new Error('Not signed in');
  return uid;
}

// The signed-in person's profile, or null if they don't have one yet.
// Throws if it can't be loaded (no connection, table missing, ...).
export async function loadProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', requireUid())
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

// Saves the helper sign-up and puts the person in helper mode.
export async function saveHelperSignup(input: HelperSignup): Promise<Profile> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: requireUid(), ...input, mode: 'helper', helper_onboarded_at: now, updated_at: now },
      { onConflict: 'user_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// Switches between hiring ("customer") and helping ("helper"). The app remembers it.
export async function setMode(mode: Mode): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: requireUid(), mode, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

// Turns gig alerts on or off.
export async function setHelperAlerts(on: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ helper_alerts: on, updated_at: new Date().toISOString() })
    .eq('user_id', requireUid());
  if (error) throw error;
}

// Where to send someone right after login: helper mode if that's where they left off.
// If the profile can't be loaded, they go to the customer side so login never gets stuck.
export async function homeRouteAfterLogin(): Promise<'/main' | '/helper'> {
  try {
    const profile = await loadProfile();
    return profile?.mode === 'helper' && profile.helper_onboarded_at ? '/helper' : '/main';
  } catch (e) {
    if (__DEV__) console.warn('Could not load profile after login:', e);
    return '/main';
  }
}
