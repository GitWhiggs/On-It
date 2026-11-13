
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import { getAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAppColors, AppColors } from '@/theme';

const CATEGORIES = [
  'Moving',
  'Yard work',
  'Events',
  'Errands',
  'Seasonal',
];

type Mode = 'customer' | 'helper';
type Vehicle = 'none' | 'car' | 'truck';

type OnboardingData = {
  firstName: string;
  mode: Mode | null;
  categories: string[];
  city: string;
  vehicle: Vehicle;
};

const EMPTY_DATA: OnboardingData = {
  firstName: '',
  mode: null,
  categories: [],
  city: '',
  vehicle: 'none',
};

export default function Onboarding() {
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [vehicle, setVehicle] = useState<Vehicle>('none');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const latestData = useRef<OnboardingData>(EMPTY_DATA);
  const revision = useRef(0);
  const mounted = useRef(true);

  const currentData = useCallback((): OnboardingData => ({
    firstName,
    mode,
    categories,
    city,
    vehicle,
  }), [firstName, mode, categories, city, vehicle]);

  // Keep the latest form values available to save operations.
  useEffect(() => {
    latestData.current = currentData();
  }, [currentData]);

  // Load the existing pending profile when onboarding opens.
  useEffect(() => {
    mounted.current = true;

    async function loadProfile() {
      const user = getAuth().currentUser;

      if (!user) {
        router.replace('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'first_name, mode, helper_categories, helper_city, helper_vehicle, onboarding_completed'
          )
          .eq('user_id', user.uid)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error('Your pending account profile could not be found.');
        }

        if (data.onboarding_completed) {
          router.replace('/main');
          return;
        }

        const restoredMode: Mode | null =
          data.mode === 'customer' || data.mode === 'helper'
            ? data.mode
            : null;

        const restoredVehicle: Vehicle =
          data.helper_vehicle === 'car' || data.helper_vehicle === 'truck'
            ? data.helper_vehicle
            : 'none';

        const restoredData: OnboardingData = {
          firstName: data.first_name ?? '',
          mode: restoredMode,
          categories: data.helper_categories ?? [],
          city: data.helper_city ?? '',
          vehicle: restoredVehicle,
        };

        latestData.current = restoredData;

        setFirstName(restoredData.firstName);
        setMode(restoredData.mode);
        setCategories(restoredData.categories);
        setCity(restoredData.city);
        setVehicle(restoredData.vehicle);

        hydrated.current = true;
      } catch (error) {
        console.error('[On-It] Could not load onboarding:', error);

        if (mounted.current) {
          Alert.alert(
            'Could not load your progress',
            'Please check your connection and try again.',
            [
              {
                text: 'Try again',
                onPress: () => void loadProfile(),
              },
            ]
          );
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      mounted.current = false;

      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [router]);

  // Serialize writes so an older autosave cannot overwrite a newer one.
  const persistProfile = useCallback(
    (values: OnboardingData, completed = false): Promise<void> => {
      const user = getAuth().currentUser;

      if (!user) {
        return Promise.reject(
          new Error('Your sign-in session has expired.')
        );
      }

      const operation = saveQueue.current.then(async () => {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: values.firstName.trim(),
            mode: values.mode ?? 'customer',
            helper_categories:
              values.mode === 'helper' ? values.categories : [],
            helper_city:
              values.mode === 'helper' ? values.city.trim() : null,
            helper_vehicle:
              values.mode === 'helper' ? values.vehicle : 'none',
            helper_radius_miles: 10,
            helper_availability: 'online',
            helper_alerts: true,
            onboarding_completed: completed,
            // Helper completion is recorded only by the dedicated helper sign-up flow.
            helper_onboarded_at: null,
          })
          .eq('user_id', user.uid);

        if (error) throw error;
      });

      // Keep the queue usable even if an earlier save fails.
      saveQueue.current = operation.catch(() => {});

      return operation;
    },
    []
  );

  // Automatically save changes after the user pauses typing or selecting.
  useEffect(() => {
    if (!hydrated.current || loading || busy) return;

    if (timer.current) {
      clearTimeout(timer.current);
    }

    const snapshot = currentData();

    timer.current = setTimeout(async () => {
      const currentRevision = revision.current;

      setSaveStatus('saving');

      try {
        await persistProfile(snapshot);

        if (!mounted.current) return;

        if (revision.current === currentRevision) {
          setSaveStatus('saved');
        }
      } catch (error) {
        console.error('[On-It] Autosave failed:', error);

        if (mounted.current) {
          setSaveStatus('error');
        }
      }
    }, 700);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [
    firstName,
    mode,
    categories,
    city,
    vehicle,
    loading,
    busy,
    currentData,
    persistProfile,
  ]);

  function changeFirstName(value: string) {
    revision.current += 1;
    setFirstName(value);
    setSaveStatus('idle');
  }

  function changeMode(value: Mode) {
    revision.current += 1;
    setMode(value);
    setSaveStatus('idle');
  }

  function changeCity(value: string) {
    revision.current += 1;
    setCity(value);
    setSaveStatus('idle');
  }

  function changeVehicle(value: Vehicle) {
    revision.current += 1;
    setVehicle(value);
    setSaveStatus('idle');
  }

  function toggleCategory(category: string) {
    revision.current += 1;

    setCategories((current) =>
      current.includes(category)
        ? current.filter((v) => v !== category)
        : [...current, category]
    );

    setSaveStatus('idle');
  }

  async function finish() {
    const user = getAuth().currentUser;

    if (!user) {
      Alert.alert(
        'Sign-in required',
        'Please verify your phone number again.'
      );
      router.replace('/');
      return;
    }

    const values = latestData.current;

    if (!values.firstName.trim()) {
      Alert.alert('Add your name', 'Enter your first name to continue.');
      return;
    }

    if (!values.mode) {
      Alert.alert(
        'Choose how to use On-It',
        'Select I need help or I want to earn as a helper.'
      );
      return;
    }

    if (values.mode === 'helper' && values.categories.length === 0) {
      Alert.alert(
        'Choose a category',
        'Select at least one type of help you can provide.'
      );
      return;
    }

    if (values.mode === 'helper' && !values.city.trim()) {
      Alert.alert(
        'Add your city',
        'Helpers need a city so we know where they work.'
      );
      return;
    }

    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    setBusy(true);
    setSaveStatus('saving');

    try {
      // Wait for any previous autosave, then perform the final save.
      await persistProfile(values, true);

      if (!mounted.current) return;

      setSaveStatus('saved');
      router.replace(values.mode === 'helper' ? '/become-helper' : '/main');
    try {
      // New accounts only: users who already have a profile never reach this screen.
      // Timestamps (created_at / updated_at) are set by the database, not the client.
      const { error } = await supabase.from('profiles').insert({
        user_id: user.uid,
        first_name: firstName.trim(),
        mode,
        helper_categories: mode === 'helper' ? categories : [],
        helper_city: mode === 'helper' ? city.trim() : null,
        helper_vehicle: mode === 'helper' ? vehicle : 'none',
        helper_radius_miles: 10,
        helper_availability: 'online',
        helper_alerts: true,
        helper_onboarded_at: mode === 'helper' ? new Date().toISOString() : null,
      });
      // 23505 = unique violation: a profile already exists (e.g. double tap). Treat as success.
      if (error && error.code !== '23505') throw error;
      router.replace(mode === 'helper' ? '/helper' : '/main');
    } catch (error) {
      console.error('[On-It] Final onboarding save failed:', error);

      if (mounted.current) {
        setSaveStatus('error');

        Alert.alert(
          'Could not save your account',
          'Your onboarding is not complete yet. Check your connection and try again.'
        );
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <Text style={styles.subtitle}>Loading your saved progress…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="auto" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>OnIt</Text>

          <Text style={styles.title}>Let's get you set up.</Text>

          <Text style={styles.subtitle}>
            First, what should we call you?
          </Text>

          <TextInput
            value={firstName}
            onChangeText={changeFirstName}
            placeholder="First name"
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel="First name"
          />

          <Text style={styles.sectionTitle}>
            How do you want to use On-It?
          </Text>

          <Choice
            title="I need help"
            subtitle="Book someone for a task."
            selected={mode === 'customer'}
            onPress={() => changeMode('customer')}
            styles={styles}
          />

          <Choice
            title="I want to earn as a helper"
            subtitle="Help people nearby and get paid."
            selected={mode === 'helper'}
            onPress={() => changeMode('helper')}
            styles={styles}
          />

          {mode === 'helper' && (
            <View style={styles.helperSection}>
              <Text style={styles.sectionTitle}>
                What can you help with?
              </Text>

              <Text style={styles.hint}>Choose all that apply.</Text>

              <View style={styles.chips}>
                {CATEGORIES.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => toggleCategory(category)}
                    style={[
                      styles.chip,
                      categories.includes(category) && styles.chipSelected,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: categories.includes(category),
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        categories.includes(category) &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>
                What city are you based in?
              </Text>

              <TextInput
                value={city}
                onChangeText={changeCity}
                placeholder="e.g. Storrs"
                placeholderTextColor={C.textMuted}
                autoCapitalize="words"
                style={styles.input}
                accessibilityLabel="Helper city"
              />

              <Text style={styles.sectionTitle}>
                Do you have a vehicle?
              </Text>

              <View style={styles.vehicleRow}>
                {(['none', 'car', 'truck'] as const).map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => changeVehicle(v)}
                    style={[
                      styles.vehicle,
                      vehicle === v && styles.vehicleSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: vehicle === v }}
                  >
                    <Text
                      style={[
                        styles.vehicleText,
                        vehicle === v && styles.vehicleTextSelected,
                      ]}
                    >
                      {v === 'none'
                        ? 'No vehicle'
                        : v === 'car'
                          ? 'Car'
                          : 'Truck'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.saveRow}>
            {saveStatus === 'saving' && (
              <Text style={styles.saveText}>Saving your progress…</Text>
            )}

            {saveStatus === 'saved' && (
              <Text style={styles.savedText}>✓ Progress saved</Text>
            )}

            {saveStatus === 'error' && (
              <Pressable
                onPress={() => {
                  setSaveStatus('saving');
                  void persistProfile(latestData.current)
                    .then(() => setSaveStatus('saved'))
                    .catch(() => setSaveStatus('error'));
                }}
              >
                <Text style={styles.errorText}>
                  Couldn't save. Tap to retry.
                </Text>
              </Pressable>
            )}
          </View>

          <Button
            label={busy ? 'Saving…' : 'Continue'}
            onPress={finish}
            disabled={
              busy ||
              !firstName.trim() ||
              !mode
            }
          />

          <Text style={styles.footnote}>
            Your progress saves automatically. You can close On-It and
            continue later.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Choice({
  title,
  subtitle,
  selected,
  onPress,
  styles,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choice,
        selected && styles.choiceSelected,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceSubtitle}>{subtitle}</Text>
      </View>

      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
        ]}
      />
    </Pressable>
  );
}

const makeStyles = (C: AppColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: C.bg,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 18,
      paddingBottom: 40,
      gap: 12,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    brand: {
      color: C.accent,
      fontSize: 32,
      fontWeight: '800',
      marginBottom: 10,
    },
    title: {
      color: C.text,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    subtitle: {
      color: C.textSecondary,
      fontSize: 16,
      marginTop: 4,
    },
    input: {
      height: 54,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      color: C.text,
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      marginBottom: 8,
    },
    sectionTitle: {
      color: C.text,
      fontSize: 17,
      fontWeight: '700',
      marginTop: 10,
    },
    hint: {
      color: C.textMuted,
      fontSize: 13,
      marginTop: -8,
    },
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    choiceSelected: {
      borderColor: C.accent,
      borderWidth: 2,
    },
    choiceTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '700',
    },
    choiceSubtitle: {
      color: C.textSecondary,
      fontSize: 13,
      marginTop: 3,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: C.textMuted,
    },
    radioSelected: {
      borderColor: C.accent,
      backgroundColor: C.accent,
      borderWidth: 5,
    },
    helperSection: {
      gap: 10,
      marginTop: 4,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    chipSelected: {
      borderColor: C.accent,
      backgroundColor: C.accent,
    },
    chipText: {
      color: C.text,
      fontWeight: '600',
      fontSize: 14,
    },
    chipTextSelected: {
      color: '#FFFFFF',
    },
    vehicleRow: {
      flexDirection: 'row',
      gap: 8,
    },
    vehicle: {
      flex: 1,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 12,
      backgroundColor: C.surface,
    },
    vehicleSelected: {
      backgroundColor: C.accent,
      borderColor: C.accent,
    },
    vehicleText: {
      color: C.text,
      fontWeight: '600',
      fontSize: 13,
    },
    vehicleTextSelected: {
      color: '#FFFFFF',
    },
    saveRow: {
      minHeight: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveText: {
      color: C.textMuted,
      fontSize: 12,
    },
    savedText: {
      color: '#16834A',
      fontSize: 12,
      fontWeight: '600',
    },
    errorText: {
      color: '#DC2626',
      fontSize: 12,
      fontWeight: '600',
    },
    footnote: {
      color: C.textMuted,
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
    },
  });
