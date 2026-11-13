// Helper Account: the settings saved at sign-up, plus the way back to hiring.
// Gig alerts can be changed here. Editing the other settings comes later.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toggle from '@/components/Toggle';
import { notify } from '@/lib/notify';
import {
  AVAILABILITY_LABELS, VEHICLE_LABELS, setHelperAlerts, setMode, type Profile,
} from '@/lib/profile';

const C = {
  bg: '#FAFAF7',
  tile: '#EFEDE7',
  line: '#E4E2DB',
  text: '#111111',
  textSecondary: '#5E5E5A',
  caption: '#6E6E68',
  accent: '#3B83F6',
};

type Props = {
  profile: Profile | null;
  // True when the profile couldn't be loaded.
  loadFailed: boolean;
  onRetry: () => void;
  onProfileChange: (profile: Profile) => void;
};

export default function HelperAccount({ profile, loadFailed, onRetry, onProfileChange }: Props) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);

  const name = profile?.first_name?.trim() || 'Your account';
  const initial = profile?.first_name?.trim().charAt(0).toUpperCase() || '';

  const kinds = profile?.helper_categories?.length ? profile.helper_categories.join(', ') : 'Not set';
  const area = profile?.helper_city
    ? `${profile.helper_city} · ${profile.helper_radius_miles} mi`
    : 'Not set';
  const availability = profile ? AVAILABILITY_LABELS[profile.helper_availability] : 'Not set';
  const vehicle = profile?.helper_vehicle ? VEHICLE_LABELS[profile.helper_vehicle] : 'Not set';

  function editingSoon() {
    notify('Coming soon', 'You’ll be able to change this here soon.');
  }

  function comingSoon() {
    notify('Coming soon', 'This isn’t set up yet.');
  }

  async function toggleAlerts(on: boolean) {
    if (!profile || savingAlerts) return;
    setSavingAlerts(true);
    onProfileChange({ ...profile, helper_alerts: on });
    try {
      await setHelperAlerts(on);
    } catch (e) {
      if (__DEV__) console.warn('Could not save gig alerts:', e);
      onProfileChange({ ...profile, helper_alerts: !on });
      notify('Couldn’t save that', 'Check your connection and try again.');
    } finally {
      setSavingAlerts(false);
    }
  }

  async function switchToHiring() {
    if (switching) return;
    Haptics.selectionAsync();
    setSwitching(true);
    try {
      await setMode('customer');
      router.replace('/main');
    } catch (e) {
      if (__DEV__) console.warn('Could not switch to hiring:', e);
      notify('Couldn’t switch to hiring', 'Check your connection and try again.');
      setSwitching(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profile}>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.modePill}>
              <MaterialCommunityIcons name="swap-horizontal" size={15} color="#FFFFFF" />
              <Text style={styles.modePillText}>Helper mode</Text>
            </View>
            <Text style={styles.rating}>New helper · No ratings yet</Text>
          </View>
          <View style={styles.avatar}>
            {initial ? (
              <Text style={styles.avatarText}>{initial}</Text>
            ) : (
              <MaterialCommunityIcons name="account" size={30} color="#FFFFFF" />
            )}
          </View>
        </View>

        {loadFailed && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Couldn’t load your helper settings. Check your connection.</Text>
            <Pressable style={styles.noticeBtn} onPress={onRetry} accessibilityRole="button">
              <Text style={styles.noticeBtnText}>Try again</Text>
            </Pressable>
          </View>
        )}

        <View>
          <Text style={styles.groupTitle}>Your work</Text>
          <View style={styles.group}>
            <Row label="Kinds of gigs" value={kinds} onPress={editingSoon} />
            <Row label="Work area" value={area} onPress={editingSoon} />
            <Row label="Availability" value={availability} onPress={editingSoon} />
            <Row label="Getting around" value={vehicle} onPress={editingSoon} />
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.rowLabel}>Gig alerts</Text>
              <Toggle
                value={profile?.helper_alerts ?? false}
                onValueChange={toggleAlerts}
                disabled={!profile || savingAlerts}
                label="Gig alerts"
              />
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.groupTitle}>Getting paid</Text>
          <View style={styles.group}>
            <Row label="Payout method" value="Not added yet" onPress={comingSoon} />
            <Row label="Tax info" onPress={comingSoon} last />
          </View>
        </View>

        <View>
          <Text style={styles.groupTitle}>Safety and help</Text>
          <View style={styles.group}>
            <Row label="Safety tools" onPress={comingSoon} />
            <Row label="Help & support" onPress={comingSoon} />
            <Row label="Helper guidelines" onPress={comingSoon} last />
          </View>
        </View>

        <View style={styles.switchWrap}>
          <Pressable
            style={[styles.switchBtn, switching && styles.switchBtnBusy]}
            onPress={switchToHiring}
            disabled={switching}
            accessibilityRole="button"
            accessibilityLabel="Switch to hiring"
          >
            <MaterialCommunityIcons name="swap-horizontal" size={19} color={C.text} />
            <Text style={styles.switchBtnText}>{switching ? 'Switching…' : 'Switch to hiring'}</Text>
          </Pressable>
          <Text style={styles.switchNote}>Need a hand yourself? Your helper settings stay saved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, onPress, last }: { label: string; value?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      style={[styles.row, last && styles.lastRow]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {!!value && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
      <MaterialCommunityIcons name="chevron-right" size={21} color={C.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 130, gap: 22 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profile: { flex: 1, gap: 8 },
  name: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  modePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: C.text,
  },
  modePillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  rating: { color: C.textSecondary, fontSize: 16, marginTop: 2 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },

  notice: { backgroundColor: C.tile, borderRadius: 16, padding: 16, gap: 12 },
  noticeText: { color: C.text, fontSize: 15, lineHeight: 21 },
  noticeBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  groupTitle: {
    color: C.caption,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  group: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { flex: 1, color: C.text, fontSize: 17, fontWeight: '500' },
  rowValue: { flexShrink: 1, maxWidth: '55%', color: C.textSecondary, fontSize: 15, textAlign: 'right' },

  switchWrap: { gap: 8 },
  switchBtn: {
    minHeight: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  switchBtnBusy: { opacity: 0.6 },
  switchBtnText: { color: C.text, fontSize: 16, fontWeight: '700' },
  switchNote: { color: C.caption, fontSize: 13, textAlign: 'center' },
});
