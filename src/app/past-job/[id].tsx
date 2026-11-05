import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TrackMap from '@/components/TrackMap';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  tile: '#EFEDE7',
  line: '#E4E2DB',
  text: '#111111',
  textSecondary: '#5E5E5A',
  textMuted: '#9A9A94',
  accent: '#3B83F6',
};

const HELPER = { name: 'Marcus V.', rating: '4.94', jobs: 128 };
const money = (n: number | string) => `$${Number(n).toFixed(2)}`;

export default function JobDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setJob(data);
      } catch (err) {
        console.error('Error fetching job detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [id]);

  function openSupport() {
    router.push({ pathname: '/chat/[id]', params: { id: '2', name: 'On-It Support' } });
  }

  function openHelp() {
    Alert.alert('Need help with this past job?', undefined, [
      { text: 'Contact support', onPress: openSupport },
      { text: 'Never mind', style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <ActivityIndicator color={C.textMuted} />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <Text style={styles.text}>Job not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Header with Back Button */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Job summary</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.live}>
          <Text style={styles.headline}>Job completed.</Text>
          <TrackMap step={4} helper="here" readOnly onActionPress={() => {}} />
        </View>

        <View style={styles.block}>
          <View style={[styles.row, styles.helperRow]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{HELPER.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.helperName}>{HELPER.name}</Text>
              <Text style={styles.helperSub}>★ {HELPER.rating} · {HELPER.jobs} jobs</Text>
            </View>
          </View>

          <View style={[styles.row, styles.detailRow]}>
            <Text style={styles.detailLabel}>Job</Text>
            <Text style={styles.detailValue}>{job.category}</Text>
          </View>
          <View style={[styles.row, styles.detailRow]}>
            <Text style={styles.detailLabel}>Where</Text>
            <Text style={[styles.detailValue, styles.detailValueWrap]} numberOfLines={2}>
              {job.address || 'my place'}
            </Text>
          </View>
          <View style={[styles.row, styles.detailRow]}>
            <Text style={styles.detailLabel}>When</Text>
            <Text style={styles.detailValue}>{job.when_text || 'As soon as possible'}</Text>
          </View>
          {job.price != null && job.service_fee != null && (
            <>
              <View style={[styles.row, styles.detailRow]}>
                <Text style={styles.detailLabel}>Job price</Text>
                <Text style={styles.detailValue}>{money(job.price)}</Text>
              </View>
              <View style={[styles.row, styles.detailRow]}>
                <Text style={styles.detailLabel}>Service fee</Text>
                <Text style={styles.detailValue}>{money(job.service_fee)}</Text>
              </View>
            </>
          )}
          <View style={[styles.row, styles.detailRow]}>
            <Text style={styles.detailLabel}>Total Paid</Text>
            <Text style={[styles.detailValue, styles.detailStrong]}>{money(job.amount)}</Text>
          </View>

          {/* Need help with this job option */}
          <Pressable style={[styles.row, styles.helpRow]} onPress={openHelp} accessibilityRole="button">
            <Text style={styles.helpText}>Need help with this job?</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={C.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  headerSpacer: { width: 36 },

  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 24 },
  live: { backgroundColor: C.text, borderRadius: 20, padding: 20, gap: 16 },
  headline: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 34 },
  block: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  row: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.text, fontSize: 18, fontWeight: '700' },
  helperName: { color: C.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  helperSub: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  detailLabel: { color: C.textSecondary, fontSize: 15 },
  detailValue: { color: C.text, fontSize: 15, fontWeight: '500' },
  detailValueWrap: { flexShrink: 1, textAlign: 'right', marginLeft: 16 },
  detailStrong: { fontWeight: '800' },
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  helpText: { color: C.text, fontSize: 16, fontWeight: '500' },
  text: { color: C.text, fontSize: 16 },
});