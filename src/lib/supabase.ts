// Connects the app to Supabase, which handles accounts and sign-in.
// Supabase sends the text codes through Twilio Verify (set up in the Supabase dashboard).
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

// False until the two values are in your .env file (see README).
export const supabaseReady = Boolean(url && key);

export const supabase = createClient(url || 'https://missing.supabase.co', key || 'missing-key', {
  auth: {
    storage: AsyncStorage, // keeps people signed in after they close the app
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh the sign-in while the app is open on screen.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
