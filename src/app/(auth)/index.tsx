
import { useRef, useState } from 'react';
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
  signInWithPhoneNumber,
  signOut,
  ensureSupabaseRole,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BLUE, useTheme } from '@/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';

const CODE_LENGTH = 6;
type Confirmation = Awaited<ReturnType<typeof signInWithPhoneNumber>>;

function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';

  if (code === 'auth/invalid-phone-number') {
    return 'That phone number doesn’t look right.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Too many tries. Wait a few minutes and try again.';
  }

  if (code === 'auth/quota-exceeded') {
    return 'We can’t send texts right now. Try again later.';
  }

  const fallback = 'Couldn’t send the code. Check your connection and try again.';
  return __DEV__
    ? `${fallback}\n[${code || 'no code'}] ${(e as Error)?.message ?? ''}`
    : fallback;
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
  const params = useLocalSearchParams<{ mode?: string }>();

  const authMode: 'signup' | 'login' =
    params.mode === 'signup' ? 'signup' : 'login';

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirmation = useRef<Confirmation | null>(null);

  const digits = phone.replace(/\D/g, '');
  const phoneReady = digits.length === 10;
  const codeReady = code.length === CODE_LENGTH;

  async function sendCode() {
    setBusy(true);
    setError('');

    try {
      confirmation.current = await signInWithPhoneNumber(
        getAuth(),
        `+1${digits}`
      );

      setCode('');
      setStep('code');
    } catch (e) {
      if (__DEV__) console.warn('Send code failed:', e);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
    } finally { setBusy(false); }
  }

  async function continueAfterVerification() {
    const { data, error: profileError } = await supabase
      .from('profiles').select('user_id, mode, helper_onboarded_at').eq('user_id', getAuth().currentUser?.uid ?? '').maybeSingle();
    if (profileError) throw profileError;
    if (!data) { router.replace('/onboarding'); return; }
    // Helpers who left off in helper mode land back on the helper side.
    router.replace(data.mode === 'helper' && data.helper_onboarded_at ? '/helper' : '/main');
  }

  async function verify() {
    setBusy(true);
    setError('');

    try {
      if (!confirmation.current) {
        throw new Error('No active verification session. Request a new code.');
      }

      await confirmation.current.confirm(code);
      await ensureSupabaseRole();

      const uid = getAuth().currentUser?.uid;

      if (!uid) {
        throw new Error('Your verified session could not be found.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, onboarding_completed, mode, helper_onboarded_at')
        .eq('user_id', uid)
        .maybeSingle();

      if (profileError) throw profileError;

      if (authMode === 'signup') {
        if (profile?.onboarding_completed) {
          await signOut(getAuth());
          confirmation.current = null;
          setCode('');
          setStep('phone');
          setError(
            'This number already has an On-It account. Please log in instead.'
          );
          return;
        }

        // Create a pending profile so an interrupted signup can be resumed.
        if (!profile) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: uid,
              first_name: '',
              mode: 'customer',
              helper_categories: [],
              helper_vehicle: 'none',
              helper_radius_miles: 10,
              helper_availability: 'online',
              helper_alerts: true,
              onboarding_completed: false,
            });

          if (insertError && insertError.code !== '23505') {
            throw insertError;
          }
        }

        router.replace('/onboarding');
        return;
      }

      if (!profile) {
        await signOut(getAuth());
        confirmation.current = null;
        setCode('');
        setStep('phone');
        setError(
          'We couldn’t find an On-It account for this number. Please sign up first.'
        );
        return;
      }

      // Incomplete signups can resume onboarding.
      if (!profile.onboarding_completed) {
        router.replace('/onboarding');
      } else if (profile.mode === 'helper' && profile.helper_onboarded_at) {
        router.replace('/helper');
      } else {
        router.replace('/main');
      }
    } catch (e: any) {
      console.error('[On-It] Account setup failed:', {
        code: e?.code,
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
      });
    
      const message = [
        e?.code,
        e?.message,
        e?.details,
      ].filter(Boolean).join(' — ');
    
      setError(
        __DEV__
          ? `Setup error: ${message || 'Unknown error'}`
          : 'We couldn’t finish setting up your account. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  function skipVerification() {
    if (__DEV__) router.replace('/main');
  }

  const field = [
    styles.field,
    {
      backgroundColor: t.field,
      borderColor: focused ? BLUE : t.line,
    },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar style="auto" />

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={[styles.brand, { color: BLUE }]}>OnIt</Text>

        {step === 'phone' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: t.text }]}>
              {authMode === 'signup'
                ? 'Create your account'
                : 'Welcome back'}
            </Text>

            <Text style={[styles.sub, { color: t.muted }]}>
              {authMode === 'signup'
                ? 'Enter your phone number to get started.'
                : 'Enter the phone number linked to your account.'}{' '}
              We’ll text you a verification code.
            </Text>

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

            <Button
              label={busy ? 'Sending…' : 'Send code'}
              onPress={sendCode}
              disabled={!phoneReady || busy}
            />

            {__DEV__ && (
              <Pressable
                onPress={skipVerification}
                disabled={busy}
                accessibilityRole="button"
                style={styles.devButton}
              >
                <Text style={styles.devButtonText}>
                  Skip verification (Development)
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {step === 'code' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: t.text }]}>
              Enter your code
            </Text>

            <Text style={[styles.sub, { color: t.muted }]}>
              Sent to +1 {phone}
            </Text>

            <View style={field}>
              <TextInput
                style={[styles.input, styles.code, { color: t.text }]}
                value={code}
                onChangeText={(v) =>
                  setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))
                }
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

            <Button
              label={busy ? 'Checking…' : 'Verify'}
              onPress={verify}
              disabled={!codeReady || busy}
            />

            <View style={styles.links}>
              <Pressable
                onPress={() => {
                  setError('');
                  setStep('phone');
                }}
                accessibilityRole="button"
                style={styles.link}
              >
                <Text style={[styles.linkText, { color: BLUE }]}>
                  Change number
                </Text>
              </Pressable>

              <Pressable
                onPress={sendCode}
                disabled={busy}
                accessibilityRole="button"
                style={styles.link}
              >
                <Text style={[styles.linkText, { color: BLUE }]}>
                  Resend code
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 32,
  },
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
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    height: '100%',
  },
  code: { letterSpacing: 6 },
  error: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: { paddingVertical: 12 },
  linkText: { fontSize: 15, fontWeight: '600' },
  devButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  devButtonText: {
    color: '#777777',
    fontSize: 13,
    fontWeight: '600',
  },
});
