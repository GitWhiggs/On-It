import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TrackMap from '@/components/TrackMap';
import { supabase } from '@/lib/supabase';

const C = {
  bg: '#FAFAF7',
  tile: '#EFEDE7',
  line: '#E4E2DB',
  text: '#111111',
  textSecondary: '#5E5E5A',
  textMuted: '#9A9A94',
  accent: '#3B83F6',
};

type Job = {
  id: string | number;
  category: string;
  address: string | null;
  when_text: string | null;
  amount: number | string;
  price?: number | string | null;
  service_fee?: number | string | null;
  status: string;
  stage?: number | null;
  created_at: string;
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

type SegState = 'done' | 'active' | 'todo';

function segmentState(i: number, step: number): SegState {
  if (step === STEPS.length - 1) return 'done';
  if (i < step) return 'done';
  if (i === step) return 'active';
  return 'todo';
}

function Segment({ state }: { state: SegState }) {
  const anim = useRef(new Animated.Value(state === 'done' ? 1 : 0)).current;

  useEffect(() => {
    if (state !== 'active') return undefined;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.delay(250),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, anim]);

  return (
    <View style={styles.bar}>
      <Animated.View
        style={[styles.barFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}

const money = (n: number | string) => `$${Number(n).toFixed(2)}`;

interface JobsProps {
  goHome?: () => void;
  unread?: boolean;
  onOpenChat?: () => void;
}

export default function Jobs({ goHome, unread }: JobsProps) {
  const router = useRouter();
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [pastJobs, setPastJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // The status comes from the job itself (its "stage" column).
  const step = Math.min(Math.max(activeJob?.stage ?? 0, 0), STEPS.length - 1);
  const matched = step >= 1;
  const mapHelper = step === 0 ? 'none' : step >= 3 ? 'here' : 'away';

  const loadJobs = useCallback(async () => {
    try {
      const { data: active, error: activeError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeError) throw activeError;
      setActiveJob((active as Job | null) ?? null);

      const { data: past, error: pastError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(30);
      if (pastError) throw pastError;
      setPastJobs((past as Job[]) ?? []);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload every time the tabs come back into view (for example right after posting a job).
  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  // "Yes, all good": the job moves to Past.
  async function handleCompleteJob() {
    if (!activeJob) return;
    // TODO: release the payment to the helper here (needs a backend call).
    const { error } = await supabase.from('jobs').update({ status: 'completed' }).eq('id', activeJob.id);
    if (error) {
      console.error('Error completing job:', error.message);
      Alert.alert('Couldn’t confirm', 'Please try again.');
      return;
    }
    setPastJobs((prev) => [{ ...activeJob, status: 'completed' }, ...prev]);
    setActiveJob(null);
  }

  async function handleCancel() {
    if (!activeJob) return;
    // TODO: refund the Stripe payment here (needs a backend call).
    const { error } = await supabase.from('jobs').update({ status: 'cancelled' }).eq('id', activeJob.id);
    if (error) {
      console.error('Error cancelling job:', error.message);
      Alert.alert('Couldn’t cancel', 'Please try again.');
      return;
    }
    setActiveJob(null);
  }

  // Dev only: tap the dark card to move the job to the next stage, saved to Supabase.
  async function devAdvance() {
    if (!activeJob) return;
    const next = (step + 1) % STEPS.length;
    setActiveJob({ ...activeJob, stage: next });
    const { error } = await supabase.from('jobs').update({ stage: next }).eq('id', activeJob.id);
    if (error) console.error('Could not save stage:', error.message);
  }

  function openChat() {
    router.push({ pathname: '/chat/[id]', params: { id: '1', name: HELPER.name } });
  }

  function openSupport() {
    router.push({ pathname: '/chat/[id]', params: { id: '2', name: 'On-It Support' } });
  }

  function openHelp() {
    const buttons = [
      // Cancelling only makes sense before the helper is on the way.
      ...(step < 2
        ? [{ text: 'Cancel request', style: 'destructive' as const, onPress: handleCancel }]
        : []),
      { text: 'Contact support', onPress: openSupport },
      { text: 'Never mind', style: 'cancel' as const },
    ];
    Alert.alert('Need help with this gig?', undefined, buttons);
  }

  // First load
  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <StatusBar style="dark" />
        <ActivityIndicator color={C.textMuted} />
      </SafeAreaView>
    );
  }

  // Brand new customer: nothing active and nothing in Past
  if (!activeJob && pastJobs.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.empty}>
          <Text style={styles.title}>Your jobs</Text>
          <View style={styles.emptyBody}>
            <Text style={styles.emptyHead}>Nothing yet.</Text>
            <Text style={styles.emptySub}>When you ask for help, you can follow it here.</Text>
            <Pressable style={styles.emptyBtn} onPress={goHome} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Ask for help</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your jobs</Text>

        {activeJob ? (
          <>
            <Pressable
              style={styles.live}
              onPress={devAdvance}
              disabled={!__DEV__}
              accessibilityRole="button"
              accessibilityLabel={`${HEADLINES[step]} Step ${step + 1} of ${STEPS.length}.`}
            >
              <Text style={styles.headline} numberOfLines={2}>
                {HEADLINES[step]}
              </Text>

              <Pressable onPress={() => {}}>
                <TrackMap step={step} helper={mapHelper} onActionPress={handleCompleteJob} />
              </Pressable>

              <View style={styles.bars}>
                {STEPS.map((name, i) => (
                  <Segment key={`${name}-${segmentState(i, step)}`} state={segmentState(i, step)} />
                ))}
              </View>
            </Pressable>
            {__DEV__ && <Text style={styles.hint}>Dev only: tap the card to move this job to the next stage</Text>}

            <View style={styles.block}>
              <View style={[styles.row, styles.helperRow]}>
                <View style={styles.avatar}>
                  {matched ? (
                    <Text style={styles.avatarText}>{HELPER.name[0]}</Text>
                  ) : (
                    <MaterialCommunityIcons name="account-outline" size={22} color={C.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.helperName}>{matched ? HELPER.name : 'Matching you now'}</Text>
                  <Text style={styles.helperSub}>
                    {matched
                      ? `★ ${HELPER.rating} · ${HELPER.jobs} jobs`
                      : 'We’ll let you know when someone accepts.'}
                  </Text>
                </View>

                {matched && (
                  <Pressable
                    style={styles.msgBtn}
                    onPress={openChat}
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${HELPER.name}`}
                  >
                    <MaterialCommunityIcons name="message-outline" size={18} color="#fff" />
                    <Text style={styles.msgText}>Message</Text>
                    {unread && <View style={styles.unreadDot} />}
                  </Pressable>
                )}
              </View>

              <View style={[styles.row, styles.detailRow]}>
                <Text style={styles.detailLabel}>Job</Text>
                <Text style={styles.detailValue}>{activeJob.category}</Text>
              </View>
              <View style={[styles.row, styles.detailRow]}>
                <Text style={styles.detailLabel}>Where</Text>
                <Text style={[styles.detailValue, styles.detailValueWrap]} numberOfLines={2}>
                  {activeJob.address || 'my place'}
                </Text>
              </View>
              <View style={[styles.row, styles.detailRow]}>
                <Text style={styles.detailLabel}>When</Text>
                <Text style={styles.detailValue}>{activeJob.when_text || 'As soon as possible'}</Text>
              </View>
              {activeJob.price != null && activeJob.service_fee != null && (
              <>
                <View style={[styles.row, styles.detailRow]}>
                  <Text style={styles.detailLabel}>Job price</Text>
                  <Text style={styles.detailValue}>
                    {money(activeJob.price)}
                  </Text>
                </View>

                <View style={[styles.row, styles.detailRow]}>
                  <Text style={styles.detailLabel}>Service fee</Text>
                  <Text style={styles.detailValue}>
                    {money(activeJob.service_fee)}
                  </Text>
                </View>
              </>
            )}

            <View style={[styles.row, styles.detailRow]}>
              <Text style={styles.detailLabel}>Total</Text>
              <Text style={[styles.detailValue, styles.detailStrong]}>
                {money(activeJob.amount)}
              </Text>
            </View>

              <Pressable style={[styles.row, styles.helpRow]} onPress={openHelp} accessibilityRole="button">
                <Text style={styles.helpText}>Need help with this gig?</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color={C.textMuted} />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.idle}>
            <Text style={styles.idleHead}>Nothing in progress.</Text>
            <Text style={styles.emptySub}>Need a hand with something?</Text>
            <Pressable style={styles.emptyBtn} onPress={goHome} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Ask for help</Text>
            </Pressable>
          </View>
        )}

        {/* Past jobs */}
        <View>
          <Text style={styles.sectionTitle}>Past</Text>
          <View style={styles.block}>
            {pastJobs.length > 0 ? (
              pastJobs.map((job) => (
                <View key={job.id} style={[styles.row, styles.pastRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pastTitle}>{job.category}</Text>
                    <Text style={styles.pastSub}>
                      {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.pastPrice}>{money(job.amount)}</Text>
                </View>
              ))
            ) : (
              <View style={[styles.row, styles.pastRow, { justifyContent: 'center', paddingVertical: 20 }]}>
                <Text style={{ color: C.textMuted, fontSize: 14 }}>No past jobs yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 130, gap: 24 },
  title: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  sectionTitle: { color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8 },
  hint: { color: C.textMuted, fontSize: 12, marginTop: -12 },

  empty: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 130 },
  emptyBody: { flex: 1, justifyContent: 'center', gap: 12 },
  emptyHead: { color: C.text, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  emptySub: { color: C.textSecondary, fontSize: 17, lineHeight: 24, maxWidth: 300 },
  emptyBtn: { alignSelf: 'flex-start', backgroundColor: C.text, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 24, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  idle: { gap: 8, paddingVertical: 8 },
  idleHead: { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  live: { backgroundColor: C.text, borderRadius: 20, padding: 20, gap: 16 },
  headline: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 34, minHeight: 68 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#3A3A38', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.accent, borderRadius: 2 },

  block: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  row: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.text, fontSize: 18, fontWeight: '700' },
  helperName: { color: C.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  helperSub: { color: C.textSecondary, fontSize: 14, marginTop: 2 },

  msgBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.text, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18 },
  msgText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent, marginLeft: 2 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  detailLabel: { color: C.textSecondary, fontSize: 15 },
  detailValue: { color: C.text, fontSize: 15, fontWeight: '500' },
  detailValueWrap: { flexShrink: 1, textAlign: 'right', marginLeft: 16 },
  detailStrong: { fontWeight: '800' },
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  helpText: { color: C.text, fontSize: 16, fontWeight: '500' },
  pastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  pastTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  pastSub: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  pastPrice: { color: C.text, fontSize: 16, fontWeight: '600' },
});