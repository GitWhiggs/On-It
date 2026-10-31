import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TrackMap from '@/components/TrackMap';

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  border: '#DAD8D1',
  text: '#111111',
  textSecondary: '#5E5E5A',
  textMuted: '#9A9A94',
  accent: '#FF5A1F',
};

const HELPER = { name: 'Marcus V.', rating: '4.94', jobs: 128 };

const STEPS = ['Posted', 'Matched', 'On the way', 'Here', 'Done'];

const HEADLINES = [
  'Finding your helper.',
  'Marcus accepted your job.',
  'Marcus is on the way.',
  'Marcus is here.',
  'Marcus finished. All good?',
];

const DETAILS = [
  { label: 'Job', value: 'Moving' },
  { label: 'Where', value: 'Storrs, CT' },
  { label: 'When', value: 'Today' },
  { label: 'Price', value: '$45' },
];

const PAST = [
  { category: 'Yard work', date: 'Oct 18', helper: 'Dana R.', price: '$60' },
  { category: 'Errands', date: 'Oct 9', helper: 'Marcus V.', price: '$25' },
  { category: 'Events', date: 'Sep 28', helper: 'Dana R.', price: '$80' },
];

type SegState = 'done' | 'active' | 'todo';

function segmentState(i: number, step: number): SegState {
  if (step === STEPS.length - 1) return 'done'; // job finished: everything full
  if (i < step) return 'done';
  if (i === step) return 'active';
  return 'todo';
}

// One piece of the progress bar.
// done = solid, todo = empty, active = fills up from empty again and again.
function Segment({ state }: { state: SegState }) {
  const anim = useRef(new Animated.Value(state === 'done' ? 1 : 0)).current;

  useEffect(() => {
    if (state !== 'active') return undefined;

    anim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(250),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, anim]);

  return (
    <View style={styles.bar}>
      <Animated.View
        style={[
          styles.barFill,
          { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

export default function Jobs({ goHome }: { goHome?: () => void }) {
  // Fake data for now. Tap the dark card to preview each step.
  const [hasJob, setHasJob] = useState(true);
  const [step, setStep] = useState(2);
  const matched = step >= 1;

  function openHelp() {
    const buttons = [
      // Cancelling only makes sense before the helper is on the way.
      ...(step < 2
        ? [{ text: 'Cancel request', style: 'destructive' as const, onPress: () => setHasJob(false) }]
        : []),
      { text: 'Contact support', onPress: () => {} },
      { text: 'Never mind', style: 'cancel' as const },
    ];
    Alert.alert('Need help with this job?', undefined, buttons);
  }

  // No job: show the empty state instead of the page.
  if (!hasJob) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.empty}>
          <Text style={styles.title}>Your jobs</Text>

          <View style={styles.emptyBody}>
            <Text style={styles.emptyHead}>Nothing yet.</Text>
            <Text style={styles.emptySub}>When you ask for help, you can follow it here.</Text>
            <Pressable style={styles.emptyBtn} onPress={goHome}>
              <Text style={styles.emptyBtnText}>Ask for help</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setStep(2);
              setHasJob(true);
            }}
          >
            <Text style={styles.hint}>Show sample job (temporary)</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your jobs</Text>

        <View style={{ gap: 12 }}>
          <Text style={styles.label}>In progress</Text>

          <Pressable style={styles.live} onPress={() => setStep((s) => (s + 1) % STEPS.length)}>
            <Text style={styles.headline}>{HEADLINES[step]}</Text>

            {step === 2 && <TrackMap />}

            <View style={styles.bars}>
              {STEPS.map((name, i) => (
                <Segment key={`${name}-${segmentState(i, step)}`} state={segmentState(i, step)} />
              ))}
            </View>
            <Text style={styles.stepText}>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </Text>

            {step === 4 && (
              <Pressable style={styles.confirm}>
                <Text style={styles.confirmText}>Yes, all good</Text>
              </Pressable>
            )}
          </Pressable>
          <Text style={styles.hint}>Tap the card to preview each step (temporary)</Text>

          {matched && (
            <View style={styles.helperCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{HELPER.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helperName}>{HELPER.name}</Text>
                <Text style={styles.helperSub}>
                  ★ {HELPER.rating} · {HELPER.jobs} jobs
                </Text>
              </View>
              <Pressable style={styles.msgBtn}>
                <MaterialCommunityIcons name="message-outline" size={18} color="#fff" />
                <Text style={styles.msgText}>Message</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.details}>
            {DETAILS.map((d, i) => (
              <View key={d.label} style={[styles.detailRow, i > 0 && styles.detailDivider]}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={openHelp} style={styles.helpLink}>
            <Text style={styles.helpText}>Need help with this job?</Text>
          </Pressable>
        </View>

        <View>
          <Text style={styles.label}>Past</Text>
          {PAST.map((job) => (
            <View key={job.date} style={styles.pastRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pastTitle}>{job.category}</Text>
                <Text style={styles.pastSub}>
                  {job.date} · {job.helper}
                </Text>
              </View>
              <Text style={styles.pastPrice}>{job.price}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 130, gap: 32 },

  title: { color: C.text, fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  label: {
    color: C.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase',
  },

  empty: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 130 },
  emptyBody: { flex: 1, justifyContent: 'center', gap: 14 },
  emptyHead: { color: C.text, fontSize: 48, fontWeight: '800', letterSpacing: -1.5 },
  emptySub: { color: C.textSecondary, fontSize: 18, lineHeight: 26, maxWidth: 300 },
  emptyBtn: {
    alignSelf: 'flex-start', backgroundColor: C.text, borderRadius: 999,
    paddingVertical: 16, paddingHorizontal: 28, marginTop: 10,
  },
  emptyBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  live: { backgroundColor: C.text, borderRadius: 28, padding: 20, gap: 18 },
  headline: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1.2, lineHeight: 42 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#3A3A38', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  stepText: { color: '#C9C7C0', fontSize: 14, fontWeight: '600' },
  hint: { color: C.textMuted, fontSize: 12 },

  confirm: {
    backgroundColor: C.accent, borderRadius: 999, paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  helperCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderColor: C.border, borderWidth: 1,
    borderRadius: 24, padding: 16,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  helperName: { color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  helperSub: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.text, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14,
  },
  msgText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  details: {
    backgroundColor: C.surface, borderColor: C.border, borderWidth: 1,
    borderRadius: 24, paddingHorizontal: 20,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 },
  detailDivider: { borderTopWidth: 1, borderTopColor: C.border },
  detailLabel: { color: C.textSecondary, fontSize: 16 },
  detailValue: { color: C.text, fontSize: 16, fontWeight: '700' },

  helpLink: { alignSelf: 'center', paddingVertical: 8 },
  helpText: {
    color: C.textSecondary, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline',
  },

  pastRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pastTitle: { color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  pastSub: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  pastPrice: { color: C.text, fontSize: 18, fontWeight: '700' },
});