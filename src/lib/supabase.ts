
import {createClient} from '@supabase/supabase-js';
import {getAuth} from '@react-native-firebase/auth';

const SUPABASE_URL = 'https://acpwxtnxtxxskuqnrffc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_wz90UqEy9rRN3mgZu0xZrw_8P0dRYtN';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    accessToken: async () => {
      const user = getAuth().currentUser;

      if (!user) {
        return null;
      }

      return user.getIdToken();
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);
