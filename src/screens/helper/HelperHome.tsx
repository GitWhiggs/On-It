// Helper Home: go online or offline.
// For now the button only changes what's on screen. Real gigs and the map come later.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Profile } from '@/lib/profile';
import { BLUE } from '@/theme';

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  line: '#E4E2DB',
  text: '#111111',
  textSecondary: '#5E5E5A',
  offline: '#86847C',
  online: '#3E7B55',
};

type Props = { profile: Profile | null };

export default function HelperHome({ profile }: Props) {
  const [online, setOnline] = useState(false);

  // "Moving, Yard work · within 15 mi of Bentonville"
  const kinds = profile?.helper_categories?.join(', ');
  const area = profile
    ? `within ${profile.helper_radius_miles} mi${profile.helper_city ? ` of ${profile.helper_city}` : ''}`
    : '';
  const summary = [kinds, area].filter(Boolean).join(' · ');

  function toggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnline((v) => !v);
  }

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
              <View style={[styles.dot, online && styles.dotOn]} />
              <Text style={[styles.status, online && styles.statusOn]}>
                {online ? 'You’re online' : 'You’re offline'}
              </Text>
            </View>

            <Text style={styles.head}>{online ? 'Looking for gigs near you' : 'Ready when you are.'}</Text>
            <Text style={styles.sub}>
              {online
                ? 'No gigs have come in yet. New ones will show up here.'
                : 'Go online to get gigs near you.'}
            </Text>
            {!!summary && <Text style={styles.meta}>{summary}</Text>}

            {online ? (
              <Pressable style={styles.offBtn} onPress={toggle} accessibilityRole="button">
                <Text style={styles.offBtnText}>Go offline</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.onBtn} onPress={toggle} accessibilityRole="button">
                <Text style={styles.onBtnText}>Go online</Text>
              </Pressable>
            )}
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
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.text,
  },
  modePillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  middle: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 22,
    gap: 10,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.offline },
  dotOn: { backgroundColor: C.online },
  status: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  statusOn: { color: C.online },
  head: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 34 },
  sub: { color: C.textSecondary, fontSize: 17, lineHeight: 24 },
  meta: { color: C.textSecondary, fontSize: 14, lineHeight: 20 },
  onBtn: {
    minHeight: 60,
    borderRadius: 999,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  onBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  offBtn: {
    minHeight: 60,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.text,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  offBtnText: { color: C.text, fontSize: 17, fontWeight: '700' },
});
