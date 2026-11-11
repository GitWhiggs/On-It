// Phone verification entry point. New accounts continue to onboarding before entering the app.
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '@/components/Button';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  ensureSupabaseRole,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BLUE, useTheme } from '@/theme';
import { useRouter } from 'expo-router';

const CODE_LENGTH = 6;
type Confirmation = Awaited<ReturnType<typeof signInWithPhoneNumber>>;

function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/invalid-phone-number') return 'That phone number doesn’t look right.';
  if (code === 'auth/too-many-requests') return 'Too many tries. Wait a few minutes and try again.';
  if (code === 'auth/quota-exceeded') return 'We can’t send texts right now. Try again later.';
  const fallback = 'Couldn’t send the code. Check your connection and try again.';
  return __DEV__ ? `${fallback}\n[${code || 'no code'}] ${(e as Error)?.message ?? ''}` : fallback;
}

function formatPhone(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function Login() {
  const t = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirmation = useRef<Confirmation | null>(null);

  useEffect(() => onAuthStateChanged(getAuth(), (user) => {
    if (user) setStep('done');
  }), []);

  const digits = phone.replace(/\D/g, '');
  const phoneReady = digits.length === 10;
  const codeReady = code.length === CODE_LENGTH;

  async function sendCode() {
    setBusy(true); setError('');
    try {
      confirmation.current = await signInWithPhoneNumber(getAuth(), `+1${digits}`);
      setCode(''); setStep('code');
    } catch (e) {
      if (__DEV__) console.warn('Send code failed:', e);
      setError(friendlyError(e));
    } finally { setBusy(false); }
  }

  async function continueAfterVerification() {
    const { data, error: profileError } = await supabase
      .from('profiles').select('user_id').eq('user_id', getAuth().currentUser?.uid ?? '').maybeSingle();
    if (profileError) throw profileError;
    router.replace(data ? '/main' : '/onboarding');
  }

  async function verify() {
    setBusy(true); setError('');
    try {
      if (!confirmation.current) throw new Error('No active verification session. Request a new code.');
      await confirmation.current.confirm(code);
      await ensureSupabaseRole();
      await continueAfterVerification();
    } catch (e) {
      if (__DEV__) console.warn('Verify/account lookup failed:', e);
      setError('Your number may be verified, but account setup failed. Please try again.');
    } finally { setBusy(false); }
  }

  // Development-only navigation. It deliberately does not create a fake Firebase account.
  function skipVerification() {
    if (__DEV__) router.replace('/main');
  }

  async function logOut() {
    await signOut(getAuth());
    confirmation.current = null; setPhone(''); setCode(''); setError(''); setStep('phone');
  }

  const field = [styles.field, { backgroundColor: t.field, borderColor: focused ? BLUE : t.line }];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={[styles.brand, { color: BLUE }]}>OnIt</Text>
        {step === 'phone' && <View style={styles.form}>
          <Text style={[styles.title, { color: t.text }]}>What's your number?</Text>
          <Text style={[styles.sub, { color: t.muted }]}>We'll text you a code. No password needed.</Text>
          <View style={field}>
            <Text style={[styles.prefix, { color: t.text }]}>+1</Text>
            <TextInput style={[styles.input, { color: t.text }]} value={phone} onChangeText={(v) => setPhone(formatPhone(v))} placeholder="(555) 123-4567" placeholderTextColor={t.muted} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" accessibilityLabel="Phone number" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoFocus />
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button label={busy ? 'Sending…' : 'Send code'} onPress={sendCode} disabled={!phoneReady || busy} />
          {__DEV__ && <Pressable onPress={skipVerification} disabled={busy} accessibilityRole="button" style={styles.devButton}><Text style={styles.devButtonText}>Skip verification (Development)</Text></Pressable>}
        </View>}
        {step === 'code' && <View style={styles.form}>
          <Text style={[styles.title, { color: t.text }]}>Enter your code</Text>
          <Text style={[styles.sub, { color: t.muted }]}>Sent to +1 {phone}</Text>
          <View style={field}><TextInput style={[styles.input, styles.code, { color: t.text }]} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))} placeholder="123456" placeholderTextColor={t.muted} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" accessibilityLabel="6-digit code" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoFocus /></View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button label={busy ? 'Checking…' : 'Verify'} onPress={verify} disabled={!codeReady || busy} />
          <View style={styles.links}>
            <Pressable onPress={() => { setError(''); setStep('phone'); }} accessibilityRole="button" style={styles.link}><Text style={[styles.linkText, { color: BLUE }]}>Change number</Text></Pressable>
            <Pressable onPress={sendCode} disabled={busy} accessibilityRole="button" style={styles.link}><Text style={[styles.linkText, { color: BLUE }]}>Resend code</Text></Pressable>
          </View>
        </View>}
        {step === 'done' && <View style={styles.form}>
          <Text style={[styles.title, { color: t.text }]}>You're signed in</Text>
          <Text style={[styles.sub, { color: t.muted }]}>Continue setting up your account.</Text>
          <Button label={busy ? 'Loading…' : 'Continue'} onPress={async () => { setBusy(true); try { await ensureSupabaseRole(); await continueAfterVerification(); } catch (e) { setError('Could not load your account. Please try again.'); if (__DEV__) console.warn(e); } finally { setBusy(false); } }} disabled={busy} />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable onPress={logOut} accessibilityRole="button" style={styles.link}><Text style={[styles.linkText, { color: BLUE }]}>Sign out</Text></Pressable>
        </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brand: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginBottom: 32 }, form: { gap: 12 },
  title: { fontSize: 26, fontWeight: '800' }, sub: { fontSize: 15, marginBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, gap: 10 },
  prefix: { fontSize: 17, fontWeight: '700' }, input: { flex: 1, fontSize: 17, fontWeight: '600', height: '100%', outlineWidth: 0 },
  code: { letterSpacing: 6 }, error: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  links: { flexDirection: 'row', justifyContent: 'space-between' }, link: { paddingVertical: 12 }, linkText: { fontSize: 15, fontWeight: '600' },
  devButton: { alignItems: 'center', paddingVertical: 12, marginTop: 4 }, devButtonText: { color: '#777777', fontSize: 13, fontWeight: '600' },
});
