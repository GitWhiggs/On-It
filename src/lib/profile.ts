// Each person's profile: their first name, whether they're hiring or helping right now,
// and their helper settings. Saved in the Supabase "profiles" table, one row per user.
// The database only lets a signed-in person read and change their own row, and it sets
// created_at / updated_at itself, so we never send those.
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
export const HELPER_CATEGORIES = ['Moving', 'Yard work', 'Events', 'Errands', 'Seasonal'] as const;

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
  const uid = requireUid();
  const changes = { ...input, mode: 'helper' as Mode, helper_onboarded_at: new Date().toISOString() };

  // Most people already have a profile row from first-time setup, so update it.
  const updated = await supabase.from('profiles').update(changes).eq('user_id', uid).select().maybeSingle();
  if (updated.error) throw updated.error;
  if (updated.data) return updated.data as Profile;

  // No row yet (older test accounts): create it.
  const created = await supabase.from('profiles').insert({ user_id: uid, ...changes }).select().single();
  if (created.error) throw created.error;
  return created.data as Profile;
}

// Switches between hiring ("customer") and helping ("helper"). The app remembers it.
export async function setMode(mode: Mode): Promise<void> {
  if (mode === 'helper') {
    const profile = await loadProfile();
    if (!profile?.helper_onboarded_at) {
      throw new Error('Complete helper sign-up before switching to helper mode.');
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ mode })
    .eq('user_id', requireUid())
    .select('user_id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No profile to update');
}

// Turns gig alerts on or off.
export async function setHelperAlerts(on: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ helper_alerts: on })
    .eq('user_id', requireUid());
  if (error) throw error;
}

// Each person's profile: their first name, whether they're hiring or helping right now,
// and their helper settings. Saved in the Supabase "profiles" table, one row per user.
// The database only lets a signed-in person read and change their own row, and it sets
// created_at / updated_at itself, so we never send those.
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
export const HELPER_CATEGORIES = ['Moving', 'Yard work', 'Events', 'Errands', 'Seasonal'] as const;

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
  const uid = requireUid();
  const changes = { ...input, mode: 'helper' as Mode, helper_onboarded_at: new Date().toISOString() };

  // Most people already have a profile row from first-time setup, so update it.
  const updated = await supabase.from('profiles').update(changes).eq('user_id', uid).select().maybeSingle();
  if (updated.error) throw updated.error;
  if (updated.data) return updated.data as Profile;

  // No row yet (older test accounts): create it.
  const created = await supabase.from('profiles').insert({ user_id: uid, ...changes }).select().single();
  if (created.error) throw created.error;
  return created.data as Profile;
}

// Switches between hiring ("customer") and helping ("helper"). The app remembers it.
export async function setMode(mode: Mode): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ mode })
    .eq('user_id', requireUid())
    .select('user_id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No profile to update');
}

// Turns gig alerts on or off.
export async function setHelperAlerts(on: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ helper_alerts: on })
    .eq('user_id', requireUid());
  if (error) throw error;
}
