// Login screen: phone number, then a 6-digit text code. No password.
// Firebase sends the code by text and signs the person in.
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '@/components/Button';
import { getAuth, onAuthStateChanged, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import { BLUE, useTheme } from '@/theme';

const CODE_LENGTH = 6;
type Confirmation = Awaited<ReturnType<typeof signInWithPhoneNumber>>;

// Turns Firebase error codes into plain words.
function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/invalid-phone-number') return 'That phone number doesn’t look right.';
  if (code === 'auth/too-many-requests') return 'Too many tries. Wait a few minutes and try again.';
  if (code === 'auth/quota-exceeded') return 'We can’t send texts right now. Try again later.';
  const fallback = 'Couldn’t send the code. Check your connection and try again.';
  // While testing, also show Firebase's exact error so we can fix it.
  return __DEV__ ? `${fallback}\n[${code || 'no code'}] ${(e as Error)?.message ?? ''}` : fallback;
}

// "5551234567" -> "(555) 123-4567"
function formatPhone(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function Login() {
  const t = useTheme();
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirmation = useRef<Confirmation | null>(null);

  // On Android, Firebase can sometimes read the text by itself and sign the person in.
  useEffect(() => onAuthStateChanged(getAuth(), (user) => { if (user) setStep('done'); }), []);

  const digits = phone.replace(/\D/g, '');
  const e164 = `+1${digits}`; // the format Firebase expects
  const phoneReady = digits.length === 10;
  const codeReady = code.length === CODE_LENGTH;

  async function sendCode() {
    setBusy(true);
    setError('');
    try {
      confirmation.current = await signInWithPhoneNumber(getAuth(), e164);
      setCode('');
      setStep('code');
    } catch (e) {
      if (__DEV__) console.warn('Send code failed:', e);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError('');
    try {
      await confirmation.current?.confirm(code);
      // Later: open the home screen here.
      setStep('done');
    } catch (e) {
      if (__DEV__) console.warn('Verify failed:', e);
      setError('That code didn’t work. Check it and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function logOut() {
    await signOut(getAuth());
    confirmation.current = null;
    setPhone('');
    setCode('');
    setError('');
    setStep('phone');
  }

  const field = [styles.field, { backgroundColor: t.field, borderColor: focused ? BLUE : t.line }];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={[styles.brand, { color: BLUE }]}>OnIt</Text>

        {step === 'phone' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: t.text }]}>What's your number?</Text>
            <Text style={[styles.sub, { color: t.muted }]}>We'll text you a code. No password needed.</Text>
            <View style={field}>
              <Text style={[styles.prefix, { color: t.text }]}>+1</Text>
              <TextInput
                style={[styles.input, { color: t.text }]}
                value={phone}
                onChangeText={(v) => setPhone(formatPhone(v))}
                placeholder="(555) 123-4567"
                placeholderTextColor={t.muted}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                accessibilityLabel="Phone number"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Button label={busy ? 'Sending…' : 'Send code'} onPress={sendCode} disabled={!phoneReady || busy} />
          </View>
        )}

        {step === 'code' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: t.text }]}>Enter your code</Text>
            <Text style={[styles.sub, { color: t.muted }]}>Sent to +1 {phone}</Text>
            <View style={field}>
              <TextInput
                style={[styles.input, styles.code, { color: t.text }]}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                placeholder="123456"
                placeholderTextColor={t.muted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                accessibilityLabel="6-digit code"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Button label={busy ? 'Checking…' : 'Verify'} onPress={verify} disabled={!codeReady || busy} />
            <View style={styles.links}>
              <Pressable onPress={() => { setError(''); setStep('phone'); }} accessibilityRole="button" style={styles.link}>
                <Text style={[styles.linkText, { color: BLUE }]}>Change number</Text>
              </Pressable>
              <Pressable onPress={sendCode} disabled={busy} accessibilityRole="button" style={styles.link}>
                <Text style={[styles.linkText, { color: BLUE }]}>Resend code</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 'done' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: t.text }]}>You're in!</Text>
            <Text style={[styles.sub, { color: t.muted }]}>The home screen comes next.</Text>
            {/* Temporary, until the Account screen has a sign-out button. */}
            <Pressable onPress={logOut} accessibilityRole="button" style={styles.link}>
              <Text style={[styles.linkText, { color: BLUE }]}>Sign out</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brand: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginBottom: 32 },
  form: { gap: 12 },
  title: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 15, marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  prefix: { fontSize: 17, fontWeight: '700' },
  input: { flex: 1, fontSize: 17, fontWeight: '600', height: '100%', outlineWidth: 0 },
  code: { letterSpacing: 6 },
  error: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { paddingVertical: 12 },
  linkText: { fontSize: 15, fontWeight: '600' },
});
