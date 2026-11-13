
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getAuth,
  onAuthStateChanged,
  ensureSupabaseRole,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BLUE } from '@/theme';

const pin = require('../../assets/OnItPinPNG.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const routing = useRef(false);

  useEffect(() => {
    let active = true;
    let initialStateHandled = false;
    let unsubscribe = () => {};

    unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
      // Only handle the initial Firebase session check.
      // Do not react to sign-ins initiated from the welcome screen.
      if (!active || initialStateHandled) return;

      initialStateHandled = true;
      unsubscribe();

      if (!user) {
        setCheckingSession(false);
        return;
      }

      routing.current = true;
      setCheckingSession(true);
      setSessionError('');

      try {
        await ensureSupabaseRole();

        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, onboarding_completed, mode, helper_onboarded_at')
          .eq('user_id', user.uid)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          if (!data || !data.onboarding_completed) {
            router.replace('/onboarding');
          } else if (data.mode === 'helper' && data.helper_onboarded_at) {
            router.replace('/helper');
          } else {
            router.replace('/main');
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[On-It] Session restore failed:', error);
        }

        routing.current = false;

        if (active) {
          setSessionError(
            'We couldn’t load your account. Check your connection and try again.'
          );
          setCheckingSession(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  function openAuthentication(mode: 'signup' | 'login') {
    router.push({
      pathname: '/(auth)',
      params: { mode },
    });
  }

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.loading}>
        <StatusBar style="dark" />
        <Image source={pin} style={styles.loadingPin} resizeMode="contain" />
        <ActivityIndicator color={BLUE} size="small" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.brandRow}>
          <Image source={pin} style={styles.pin} resizeMode="contain" />
          <Text style={styles.brand}>On-It</Text>
        </View>

        <View style={styles.message}>
          <Text style={styles.eyebrow}>LOCAL HELP. MADE SIMPLE.</Text>
          <Text style={styles.headline}>
            Get things done.
            {'\n'}
            On your terms.
          </Text>
          <Text style={styles.description}>
            Find a helping hand for the things you need to get done.
          </Text>
        </View>

        <View style={styles.actions}>
          {sessionError ? (
            <Text style={styles.error}>{sessionError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => openAuthentication('signup')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>Get started</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => openAuthentication('login')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>Log in</Text>
          </Pressable>

          <Text style={styles.footer}>
            A little help goes a long way.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAF7' },
  loading: {
    flex: 1,
    backgroundColor: '#FAFAF7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  loadingPin: { width: 58, height: 70 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pin: { width: 31, height: 38 },
  brand: {
    color: '#111827',
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  message: { marginTop: 30, marginBottom: 24 },
  eyebrow: {
    color: BLUE,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  headline: {
    color: '#111827',
    fontSize: 43,
    lineHeight: 49,
    fontWeight: '800',
    letterSpacing: -1.8,
  },
  description: {
    color: '#62665F',
    fontSize: 17,
    lineHeight: 25,
    marginTop: 17,
    maxWidth: 310,
  },
  actions: { gap: 12 },
  primaryButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondaryButton: {
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: '#D7D9D3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryText: { color: '#171B25', fontSize: 17, fontWeight: '700' },
  footer: {
    textAlign: 'center',
    color: '#92948E',
    fontSize: 13,
    marginTop: 12,
  },
  error: { color: '#B42318', fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
