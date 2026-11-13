// Helper Home is a visual preview until availability and gig matching are backed by the server.
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Profile } from '@/lib/profile';

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  line: '#E4E2DB',
  text: '#111111',
  textSecondary: '#5E5E5A',
};

type Props = { profile: Profile | null };

export default function HelperHome({ profile }: Props) {
  const kinds = profile?.helper_categories?.join(', ');
  const area = profile
    ? `within ${profile.helper_radius_miles} mi${profile.helper_city ? ` of ${profile.helper_city}` : ''}`
    : '';
  const summary = [kinds, area].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.modePill}>
          <MaterialCommunityIcons name="swap-horizontal" size={15} color="#FFFFFF" />
          <Text style={styles.modePillText}>Helper mode</Text>
        </View>

        <View style={styles.middle}>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View style={styles.dot} />
              <Text style={styles.status}>Helper tools are not active yet</Text>
            </View>
            <Text style={styles.head}>Your helper profile is ready.</Text>
            <Text style={styles.sub}>
              Gig availability and matching are not active yet. We’ll let you know when helpers can start accepting gigs.
            </Text>
            {!!summary && <Text style={styles.meta}>{summary}</Text>}
            <View style={styles.disabledBtn}>
              <Text style={styles.disabledBtnText}>Availability coming soon</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 130 },
  modePill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.text,
  },
  modePillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  middle: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: C.surface, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line, padding: 22, gap: 10, shadowColor: '#111111',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 3,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#86847C' },
  status: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  head: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 34 },
  sub: { color: C.textSecondary, fontSize: 17, lineHeight: 24 },
  meta: { color: C.textSecondary, fontSize: 14, lineHeight: 20 },
  disabledBtn: {
    minHeight: 60, borderRadius: 999, backgroundColor: '#DAD8D1',
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  disabledBtnText: { color: '#5E5E5A', fontSize: 17, fontWeight: '700' },
});
