import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
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

interface JobsProps {
  goHome?: () => void;
  unread?: boolean;
  onOpenChat?: () => void;
}

export default function Jobs({ goHome, unread }: JobsProps) {
  const router = useRouter();
  const [hasJob, setHasJob] = useState(true);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [pastJobs, setPastJobs] = useState<any[]>([]);
  const [loadingJob, setLoadingJob] = useState(true);
  const [step, setStep] = useState(0); 
  const matched = step >= 1;

  const mapHelper = step === 0 ? 'none' : step >= 3 ? 'here' : 'away';

  // Fetch active and past jobs from Supabase when the tab mounts
  useEffect(() => {
    async function fetchJobsData() {
      try {
        // Fetch latest active job
        const { data: activeData, error: activeError } = await supabase
          .from('jobs')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (activeData && !activeError) {
          setActiveJob(activeData);
          setHasJob(true);
        } else {
          setActiveJob(null);
        }

        // Fetch completed/past jobs
        const { data: pastData, error: pastError } = await supabase
          .from('jobs')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (pastData && !pastError) {
          setPastJobs(pastData);
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setLoadingJob(false);
      }
    }

    fetchJobsData();
  }, []);

  // Handle completing the job when the user taps "Yes, all good"
  async function handleCompleteJob() {
    if (!activeJob?.id) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', activeJob.id);

      if (!error) {
        setPastJobs((prev) => [activeJob, ...prev]);
        setActiveJob(null);
        setHasJob(false);
      } else {
        console.error('Error updating job status:', error.message);
      }
    } catch (err) {
      console.error('Error completing job:', err);
    }
  }

  function openChat() {
    router.push({ pathname: '/chat/[id]', params: { id: '1', name: HELPER.name } });
  }

  function openSupport() {
    router.push({ pathname: '/chat/[id]', params: { id: '2', name: 'On-It Support' } });
  }

  function openHelp() {
    const buttons = [
      ...(step < 2
        ? [{ text: 'Cancel request', style: 'destructive' as const, onPress: () => setHasJob(false) }]
        : []),
      { text: 'Contact support', onPress: openSupport },
      { text: 'Never mind', style: 'cancel' as const },
    ];
    Alert.alert('Need help with this gig?', undefined, buttons);
  }

  if (!hasJob || (!loadingJob && !activeJob)) {
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
          {__DEV__ && (
            <Pressable onPress={() => { setStep(0); setHasJob(true); }}>
              <Text style={styles.hint}>Show sample job (dev only)</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your jobs</Text>

        <Pressable
          style={styles.live}
          onPress={() => setStep((s) => (s + 1) % STEPS.length)}
          accessibilityRole="button"
          accessibilityLabel={`${HEADLINES[step]} Step ${step + 1} of ${STEPS.length}.`}
        >
          <Text style={styles.headline} numberOfLines={2}>
            {HEADLINES[step]}
          </Text>

          <Pressable onPress={() => {}}>
            <TrackMap 
              step={step} 
              helper={mapHelper} 
              onActionPress={handleCompleteJob} 
            />
          </Pressable>

          <View style={styles.bars}>
            {STEPS.map((name, i) => (
              <Segment key={`${name}-${segmentState(i, step)}`} state={segmentState(i, step)} />
            ))}
          </View>
        </Pressable>
        {__DEV__ && <Text style={styles.hint}>Dev only: tap the card to preview each step</Text>}

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
                {matched ? `★ ${HELPER.rating} · ${HELPER.jobs} jobs` : 'We’ll let you know when someone accepts.'}
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

          {/* Dynamic Live Job Details fetched from Supabase */}
          <View style={[styles.row, styles.detailRow]}>
            <Text style={styles.detailLabel}>Job</Text>
            <Text style={styles.detailValue}>{activeJob?.category || 'General Help'}</Text>
          </View>
          <View style={[styles.row, styles.detailRow]}>
            <Text style={styles.detailLabel}>Where</Text>
            <Text style={styles.detailValue}>{activeJob?.address || 'my place'}</Text>
          </View>
          <View style={[styles.row, styles.detailRow]}>
            <Text style={styles.detailLabel}>When</Text>
            <Text style={styles.detailValue}>{activeJob?.when_text || 'As soon as possible'}</Text>
          </View>
          <View style={[styles.row, styles.detailRow]}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={[styles.detailValue, styles.detailStrong]}>
              {activeJob ? `$${Number(activeJob.amount).toFixed(2)}` : '$0.00'}
            </Text>
          </View>

          <Pressable style={[styles.row, styles.helpRow]} onPress={openHelp} accessibilityRole="button">
            <Text style={styles.helpText}>Need help with this gig?</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={C.textMuted} />
          </Pressable>
        </View>

        {/* Dynamic Past Jobs Section */}
        <View>
          <Text style={styles.sectionTitle}>Past</Text>
          <View style={styles.block}>
            {pastJobs.length > 0 ? (
              pastJobs.map((job) => (
                <View key={job.id} style={[styles.row, styles.pastRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pastTitle}>{job.category}</Text>
                    <Text style={styles.pastSub}>
                      {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · Helper
                    </Text>
                  </View>
                  <Text style={styles.pastPrice}>${Number(job.amount).toFixed(2)}</Text>
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
  detailStrong: { fontWeight: '800' },
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  helpText: { color: C.text, fontSize: 16, fontWeight: '500' },
  pastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  pastTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  pastSub: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  pastPrice: { color: C.text, fontSize: 16, fontWeight: '600' },
});