// First-time helper sign-up: a welcome page, then three short steps
// (about you, where and when, getting paid). Finishing saves the profile
// and opens helper mode.
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  BackHandler, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toggle from '@/components/Toggle';
import { getUid } from '@/lib/auth';
import { notify } from '@/lib/notify';
import {
  HELPER_CATEGORIES, RADIUS_CHOICES, VEHICLE_LABELS, loadProfile, saveHelperSignup,
  type Availability, type Vehicle,
} from '@/lib/profile';
import { BLUE } from '@/theme';

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  tile: '#EFEDE7',
  line: '#E4E2DB',
  border: '#DAD8D1',
  text: '#111111',
  textSecondary: '#5E5E5A',
  caption: '#6E6E68',
};

type Step = 0 | 1 | 2 | 3;

const BENEFITS = [
  {
    icon: 'currency-usd' as const,
    title: 'Choose gigs that fit your schedule',
    body: 'Review the task details before deciding whether to accept a gig.',
  },
  {
    icon: 'check-circle-outline' as const,
    title: 'Take only the gigs you want',
    body: 'See the pay, the area and what needs doing before you accept.',
  },
  {
    icon: 'shield-check-outline' as const,
    title: 'Payouts are coming soon',
    body: 'Payout setup is not available yet. We’ll make it available before helpers can accept paid gigs.',
  },
];

const VEHICLES: Vehicle[] = ['none', 'car', 'truck'];

const AVAILABILITY_CHOICES: { id: Availability; title: string; sub: string }[] = [
  { id: 'online', title: 'Whenever I go online', sub: 'Turn gigs on from Home any time.' },
  { id: 'schedule', title: 'On a set schedule', sub: 'You’ll pick your hours in Account (coming soon).' },
];

const TERMS = [
  { id: 'age', text: 'I’m 18 or older.' },
  { id: 'contractor', text: 'I’m an independent helper, not an On-It employee.' },
  { id: 'rules', text: 'I’ll follow On-It’s helper guidelines and safety rules.' },
];

export default function BecomeHelper() {
  const router = useRouter();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const [step, setStep] = useState<Step>(0);
  const [firstName, setFirstName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState<number>(15);
  const [availability, setAvailability] = useState<Availability>('online');
  const [alerts, setAlerts] = useState(true);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Not signed in (for example after refreshing the web version): go back to login.
  // Otherwise fill in the first name if we already know it.
  useEffect(() => {
    if (!getUid()) {
      router.replace('/');
      return;
    }
    let alive = true;
    loadProfile()
      .then((p) => {
        if (!alive || !p) return;
        if (p.first_name) setFirstName((typed) => typed || p.first_name || '');
        if (p.helper_categories?.length) setCategories(p.helper_categories);
        if (p.helper_vehicle) setVehicle(p.helper_vehicle);
        if (p.helper_city) setCity(p.helper_city);
        if (p.helper_radius_miles) setRadius(p.helper_radius_miles);
        if (p.helper_availability) setAvailability(p.helper_availability);
        setAlerts(p.helper_alerts ?? true);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [router]);

  // Start each step at the top of the page.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  // Android's back button goes to the previous step instead of leaving the sign-up.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep((step - 1) as Step);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const name = firstName.trim();
  const cityName = city.trim();
  const allAgreed = TERMS.every((t) => agreed[t.id]);

  // What's still missing on this step, in plain words. null means the step is ready.
  let missing: string | null = null;
  if (step === 1) {
    if (!name) missing = 'Add your first name';
    else if (categories.length === 0) missing = 'Pick at least one kind of gig';
    else if (!vehicle) missing = 'Choose how you get around';
  } else if (step === 2) {
    if (!cityName) missing = 'Add your city';
  } else if (step === 3) {
    if (!allAgreed) missing = 'Check all three to continue';
  }

  let nextLabel = 'Continue';
  if (step === 0) nextLabel = 'Get started';
  if (step === 3) nextLabel = saving ? 'Saving…' : 'Start helping';

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/main');
  }

  function back() {
    if (step === 0) leave();
    else setStep((step - 1) as Step);
  }

  function toggleCategory(cat: string) {
    Haptics.selectionAsync();
    setCategories((list) => (list.includes(cat) ? list.filter((c) => c !== cat) : [...list, cat]));
  }

  async function next() {
    if (missing || saving) return;
    Haptics.selectionAsync();
    if (step < 3) {
      setStep((step + 1) as Step);
      return;
    }
    if (!vehicle) return;
    setSaving(true);
    try {
      await saveHelperSignup({
        first_name: name,
        // Saved in the same order they're shown.
        helper_categories: HELPER_CATEGORIES.filter((c) => categories.includes(c)),
        helper_vehicle: vehicle,
        helper_city: cityName,
        helper_radius_miles: radius,
        helper_availability: availability,
        helper_alerts: alerts,
      });
      // Clear the hiring screens underneath so "back" can't land in the wrong mode.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/helper');
    } catch (e) {
      if (__DEV__) console.warn('Could not save helper sign-up:', e);
      notify('Couldn’t save your sign-up', 'Check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            style={styles.headerBtn}
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={step === 0 ? 'Close and go back to hiring' : 'Back'}
          >
            <MaterialCommunityIcons name={step === 0 ? 'close' : 'chevron-left'} size={step === 0 ? 24 : 30} color={C.text} />
          </Pressable>

          {step === 0 ? (
            <>
              <Text style={styles.headerTitle}>Helper sign-up</Text>
              <View style={styles.headerBtn} />
            </>
          ) : (
            <>
              <View style={styles.progress}>
                {[1, 2, 3].map((n) => (
                  <View key={n} style={[styles.progressBar, n <= step && styles.progressBarOn]} />
                ))}
              </View>
              <Text style={styles.stepLabel}>Step {step} of 3</Text>
            </>
          )}
        </View>

        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <>
              <Image
                source={require('../../assets/OnItPinPNG.png')}
                style={styles.pin}
                resizeMode="contain"
                accessibilityLabel="On-It"
              />
              <Text style={styles.heroTitle}>Earn on your schedule.</Text>
              <Text style={styles.heroSub}>
                Pick up yard work, moving, events and errands near you. No experience or licenses needed.
              </Text>

              <View style={styles.benefits}>
                {BENEFITS.map((b) => (
                  <View key={b.title} style={styles.benefit}>
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name={b.icon} size={23} color={C.text} />
                    </View>
                    <View style={styles.benefitText}>
                      <Text style={styles.benefitTitle}>{b.title}</Text>
                      <Text style={styles.benefitBody}>{b.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.title}>Show customers who’s coming</Text>

              <View style={styles.nameRow}>
                <View style={styles.bigAvatar}>
                  {name ? (
                    <Text style={styles.bigAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                  ) : (
                    <MaterialCommunityIcons name="account-outline" size={32} color={C.textSecondary} />
                  )}
                </View>
                <View style={styles.flex}>
                  <Text style={styles.label}>First name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    placeholderTextColor={C.caption}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    textContentType="givenName"
                    maxLength={30}
                    returnKeyType="done"
                    accessibilityLabel="First name"
                  />
                </View>
              </View>
              <Text style={styles.caption}>Customers see your first name after you accept a gig.</Text>

              <Text style={styles.sectionTitle}>What can you help with?</Text>
              <Text style={styles.sectionSub}>Pick all that fit. You’ll only get these gigs.</Text>
              <View style={styles.chips}>
                {HELPER_CATEGORIES.map((cat) => {
                  const on = categories.includes(cat);
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => toggleCategory(cat)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={cat}
                    >
                      {on && <MaterialCommunityIcons name="check" size={17} color="#FFFFFF" />}
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>How do you get around?</Text>
              <Text style={styles.sectionSub}>Some moving gigs need a truck or van.</Text>
              <View style={styles.vehicles}>
                {VEHICLES.map((v) => {
                  const on = vehicle === v;
                  return (
                    <Pressable
                      key={v}
                      style={[styles.vehicle, on && styles.vehicleOn]}
                      onPress={() => { Haptics.selectionAsync(); setVehicle(v); }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={VEHICLE_LABELS[v]}
                    >
                      <Text style={styles.vehicleText}>{VEHICLE_LABELS[v]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.title}>Your area and hours</Text>

              <Text style={[styles.label, styles.labelSpaced]}>Your city</Text>
              <View style={styles.inputWithIcon}>
                <MaterialCommunityIcons name="map-marker-outline" size={21} color={C.textSecondary} />
                <TextInput
                  style={styles.inputInner}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City or ZIP code"
                  placeholderTextColor={C.caption}
                  autoCapitalize="words"
                  autoComplete="postal-address-locality"
                  textContentType="addressCity"
                  maxLength={60}
                  returnKeyType="done"
                  accessibilityLabel="Your city"
                />
              </View>
              <Text style={styles.caption}>City or ZIP code. It’s used to find gigs near you.</Text>

              <View style={styles.rowBetween}>
                <Text style={styles.fieldTitle}>How far will you go?</Text>
                <Text style={styles.radiusValue}>{radius} miles</Text>
              </View>
              <View style={styles.radiusRow}>
                {RADIUS_CHOICES.map((miles) => {
                  const on = radius === miles;
                  return (
                    <Pressable
                      key={miles}
                      style={[styles.radiusBtn, on && styles.radiusBtnOn]}
                      onPress={() => { Haptics.selectionAsync(); setRadius(miles); }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${miles} miles`}
                    >
                      <Text style={[styles.radiusBtnText, on && styles.radiusBtnTextOn]}>{miles}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.radiusPreview} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={[styles.radiusCircle, { width: 34 + radius * 3, height: 34 + radius * 3 }]} />
                <View style={styles.radiusDot} />
              </View>

              <Text style={[styles.fieldTitle, styles.fieldTitleSpaced]}>When do you want gigs?</Text>
              <View style={styles.radioList}>
                {AVAILABILITY_CHOICES.map((choice) => {
                  const on = availability === choice.id;
                  return (
                    <Pressable
                      key={choice.id}
                      style={[styles.radioCard, on && styles.radioCardOn]}
                      onPress={() => { Haptics.selectionAsync(); setAvailability(choice.id); }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${choice.title}. ${choice.sub}`}
                    >
                      <View style={[styles.radioRing, on && styles.radioRingOn]}>
                        {on && <View style={styles.radioDot} />}
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.radioTitle}>{choice.title}</Text>
                        <Text style={styles.radioSub}>{choice.sub}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.alertsRow}>
                <View style={styles.flex}>
                  <Text style={styles.radioTitle}>Gig alerts</Text>
                  <Text style={styles.radioSub}>Ping me when a gig I’d like pops up.</Text>
                </View>
                <Toggle value={alerts} onValueChange={setAlerts} label="Gig alerts" />
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.title}>A few final details</Text>

              <View style={styles.payCard}>
                <View style={styles.payTop}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="credit-card-outline" size={23} color={C.text} />
                  </View>
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>Where should we send your pay?</Text>
                    <Text style={styles.benefitBody}>
                      Add a debit card or bank account so we know where to send your pay.
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.payBtn}
                  onPress={() =>
                    notify('Coming soon', 'Payouts aren’t set up yet. You can finish signing up now and add this later.')
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Add payout method"
                >
                  <MaterialCommunityIcons name="lock-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Add payout method</Text>
                </Pressable>
                <Text style={styles.payNote}>You can add this later, but you’ll need it to get paid.</Text>
              </View>

              <Text style={styles.sectionTitle}>Before your first gig</Text>
              <View style={styles.terms}>
                {TERMS.map((term) => {
                  const on = !!agreed[term.id];
                  return (
                    <Pressable
                      key={term.id}
                      style={styles.term}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setAgreed((a) => ({ ...a, [term.id]: !on }));
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={term.text}
                    >
                      <View style={[styles.checkbox, on && styles.checkboxOn]}>
                        {on && <MaterialCommunityIcons name="check-bold" size={15} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.termText}>{term.text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.next, !!missing && styles.nextOff, saving && styles.nextBusy]}
            onPress={next}
            disabled={!!missing || saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!missing || saving }}
          >
            <Text style={[styles.nextText, !!missing && styles.nextTextOff]}>{missing ?? nextLabel}</Text>
          </Pressable>
          {step === 0 && (
            <Text style={styles.footNote}>3 quick steps · Switch back to hiring any time</Text>
          )}
          {step === 3 && (
            <Text style={styles.footNote}>You’ll land in helper mode. Switch back in Account.</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 24,
    paddingTop: 6,
    minHeight: 50,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headerTitle: { flex: 1, textAlign: 'center', color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.border },
  progressBarOn: { backgroundColor: BLUE },
  stepLabel: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },

  body: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 },

  // Welcome
  pin: { width: 36, height: 50, marginTop: 14, marginBottom: 14 },
  heroTitle: { color: C.text, fontSize: 40, fontWeight: '800', letterSpacing: -1, lineHeight: 42 },
  heroSub: { color: C.textSecondary, fontSize: 17, lineHeight: 24, marginTop: 14, maxWidth: 330 },
  benefits: { marginTop: 36, gap: 22 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { flex: 1, gap: 3 },
  benefitTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  benefitBody: { color: C.textSecondary, fontSize: 15, lineHeight: 21 },

  // Shared by the steps
  title: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8, lineHeight: 35 },
  label: { color: C.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  labelSpaced: { marginTop: 18 },
  caption: { color: C.caption, fontSize: 13, marginTop: 10 },
  sectionTitle: { color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: 28 },
  sectionSub: { color: C.textSecondary, fontSize: 15, marginTop: 6 },
  fieldTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  fieldTitleSpaced: { marginTop: 22, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    fontSize: 17,
    color: C.text,
  },

  // Step 1
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 22 },
  bigAvatar: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center',
  },
  bigAvatarText: { color: C.text, fontSize: 30, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: C.tile,
  },
  chipOn: { backgroundColor: C.text },
  chipText: { color: C.text, fontSize: 15, fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF' },
  vehicles: { flexDirection: 'row', gap: 10, marginTop: 14 },
  vehicle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: C.tile,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  vehicleOn: { backgroundColor: C.surface, borderColor: C.text },
  vehicleText: { color: C.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },

  // Step 2
  inputWithIcon: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
  },
  inputInner: { flex: 1, height: '100%', fontSize: 17, color: C.text },
  radiusValue: { color: BLUE, fontSize: 17, fontWeight: '800' },
  radiusRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  radiusBtn: {
    flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center',
  },
  radiusBtnOn: { backgroundColor: C.text },
  radiusBtnText: { color: C.text, fontSize: 15, fontWeight: '700' },
  radiusBtnTextOn: { color: '#FFFFFF' },
  radiusPreview: {
    height: 92,
    borderRadius: 16,
    backgroundColor: '#EDEBE4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 12,
  },
  radiusCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.14)',
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.55)',
  },
  radiusDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: BLUE, borderWidth: 3, borderColor: '#FFFFFF',
  },
  radioList: { gap: 10 },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  radioCardOn: { borderColor: C.text },
  radioRing: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#86847C', alignItems: 'center', justifyContent: 'center',
  },
  radioRingOn: { borderColor: C.text },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.text },
  radioTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  radioSub: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  alertsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },

  // Step 3
  payCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    marginTop: 22,
  },
  payTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  payBtn: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: C.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  payNote: { color: C.caption, fontSize: 13 },
  terms: { marginTop: 6 },
  term: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.text, alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: C.text },
  termText: { flex: 1, color: C.text, fontSize: 16, lineHeight: 22 },

  // Bottom button
  footer: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14, gap: 10 },
  next: { minHeight: 56, borderRadius: 999, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  nextOff: { backgroundColor: C.border },
  nextBusy: { opacity: 0.6 },
  nextText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  nextTextOff: { color: '#4A4A46' },
  footNote: { color: C.caption, fontSize: 13, textAlign: 'center' },
});