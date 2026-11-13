import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Sheet from '@/components/Sheet';
import { loadProfile, setMode, type Profile } from '@/lib/profile';
import { notify } from '@/lib/notify';
import { BLUE } from '@/theme';

const C = {
  bg: '#FAFAF7',
  tile: '#EFEDE7',
  line: '#E4E2DB',
  text: '#111111',
  textSecondary: '#5E5E5A',
  accent: '#3B83F6',
};

const QUICK_ACTIONS = [
  { label: 'Favorites', icon: 'heart-outline' as const },
  { label: 'Wallet', icon: 'wallet-outline' as const },
  { label: 'Addresses', icon: 'map-marker-outline' as const },
];

const MENU_ITEMS = [
  { label: 'Account settings', icon: 'cog-outline' as const },
  { label: 'Help & support', icon: 'lifebuoy' as const },
  { label: 'About On-It', icon: 'information-outline' as const },
];

export default function Account() {
  const router = useRouter();
  // undefined = not loaded yet (or it failed), null = this person has no profile yet.
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isHelper = !!profile?.helper_onboarded_at;

  // Load the profile whenever this screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadProfile()
        .then((p) => { if (alive) setProfile(p); })
        .catch(() => { if (alive) setProfile(undefined); });
      return () => { alive = false; };
    }, [])
  );

  // First time: open the helper sign-up. Already signed up: ask, then switch.
  async function onSwitchPress() {
    if (busy) return;
    Haptics.selectionAsync();
    let current = profile;
    if (current === undefined) {
      setBusy(true);
      try {
        current = await loadProfile();
        setProfile(current);
      } catch (e) {
        if (__DEV__) console.warn('Could not load profile:', e);
        notify('Couldn’t load your account', 'Check your connection and try again.');
        return;
      } finally {
        setBusy(false);
      }
    }
    if (current?.helper_onboarded_at) setConfirmOpen(true);
    else router.push('/become-helper');
  }

  async function confirmSwitch() {
    if (busy) return;
    setBusy(true);
    try {
      await setMode('helper');
    } catch (e) {
      if (__DEV__) console.warn('Could not switch to helper mode:', e);
      notify('Couldn’t switch to helper mode', 'Check your connection and try again.');
      setBusy(false);
      return;
    }
    // Let the sheet finish sliding away before changing screens.
    setConfirmOpen(false);
    setTimeout(() => {
      setBusy(false);
      router.replace('/helper');
    }, 420);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profile}>
            <Text style={styles.name}>Cam M.</Text>
            <View style={styles.verified}>
              <MaterialCommunityIcons name="check-circle" size={15} color={C.accent} />
              <Text style={styles.verifiedText}>Phone verified</Text>
            </View>
            <Text style={styles.rating}>★ 5.0 rating · View your profile</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>CM</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((item) => (
            <Pressable key={item.label} style={styles.actionButton}>
              <MaterialCommunityIcons name={item.icon} size={25} color={C.text} />
              <Text style={styles.actionLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.earnCard}>
          <Text style={styles.earnEyebrow}>{isHelper ? 'Helper mode' : 'Earn with On-It'}</Text>
          <Text style={styles.earnTitle}>
            {isHelper ? 'Ready to earn?' : 'Help neighbors and get paid.'}
          </Text>
          {!isHelper && (
            <Text style={styles.earnBody}>
              Pick up yard work, moving, events and errands near you. You keep 100% of every gig, plus tips.
            </Text>
          )}
          <Pressable
            style={styles.earnBtn}
            onPress={onSwitchPress}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Switch to helper mode"
          >
            {busy && !confirmOpen ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="swap-horizontal" size={19} color="#FFFFFF" />
            )}
            <Text style={styles.earnBtnText}>Switch to helper mode</Text>
          </Pressable>
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.label}
              style={[styles.menuRow, index === MENU_ITEMS.length - 1 && styles.lastMenuRow]}
            >
              <MaterialCommunityIcons name={item.icon} size={23} color={C.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={21} color={C.textSecondary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Sheet visible={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <View style={styles.sheetIcon}>
          <MaterialCommunityIcons name="swap-horizontal" size={27} color="#1D4ED8" />
        </View>
        <Text style={styles.sheetTitle}>Switch to helper mode?</Text>
        <Text style={styles.sheetBody}>
          Your tabs change to Home, Gigs, Earnings and Account. You won’t get any gigs until you tap Go online.
        </Text>
        <Pressable
          style={[styles.sheetPrimary, busy && styles.sheetPrimaryBusy]}
          onPress={confirmSwitch}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.sheetPrimaryText}>{busy ? 'Switching…' : 'Switch to helper mode'}</Text>
        </Pressable>
        <Pressable
          style={styles.sheetCancel}
          onPress={() => setConfirmOpen(false)}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </Pressable>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 105,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profile: {
    flex: 1,
    gap: 8,
  },
  name: {
    color: C.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  verified: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.tile,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  verifiedText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
  },
  rating: {
    color: C.textSecondary,
    fontSize: 16,
    marginTop: 2,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: C.tile,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 5,
  },
  actionLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  menu: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  menuRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  lastMenuRow: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    flex: 1,
    color: C.text,
    fontSize: 17,
    fontWeight: '500',
  },
  earnCard: {
    backgroundColor: C.text,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  earnEyebrow: {
    color: '#A8A8A2',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  earnTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  earnBody: {
    color: '#C9C9C3',
    fontSize: 15,
    lineHeight: 21,
  },
  earnBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: BLUE,
    marginTop: 4,
  },
  earnBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sheetIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: C.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30,
    marginBottom: 10,
  },
  sheetBody: {
    color: C.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 24,
  },
  sheetPrimary: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryBusy: {
    opacity: 0.6,
  },
  sheetPrimaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  sheetCancel: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  sheetCancelText: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
