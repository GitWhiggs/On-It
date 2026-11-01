import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://acpwxtnxtxxskuqnrffc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wz90UqEy9rRN3mgZu0xZrw_8P0dRYtN'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);