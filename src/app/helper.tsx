// Helper mode: the four tabs helpers see (Home, Gigs, Earnings, Account).
// Works like the customer tabs in main.tsx: swipe sideways or tap the bottom bar.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import BottomNav, { type NavTab } from '@/components/BottomNav';
import HelperHome from '@/screens/helper/HelperHome';
import HelperGigs from '@/screens/helper/HelperGigs';
import HelperEarnings from '@/screens/helper/HelperEarnings';
import HelperAccount from '@/screens/helper/HelperAccount';
import { getUid } from '@/lib/auth';
import { loadProfile, type Profile } from '@/lib/profile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS: NavTab[] = [
  { label: 'Home', icon: 'map-outline', activeIcon: 'map' },
  { label: 'Gigs', icon: 'clipboard-check-outline', activeIcon: 'clipboard-check' },
  { label: 'Earnings', icon: 'chart-box-outline', activeIcon: 'chart-box' },
  { label: 'Account', icon: 'account-outline', activeIcon: 'account' },
];
const LAST = TABS.length - 1;

export default function Helper() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const pageRef = useRef(0);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await loadProfile();
      // Only people who finished the helper sign-up belong here.
      if (!p || p.mode !== 'helper' || !p.helper_onboarded_at) {
        router.replace('/main');
        return;
      }
      setProfile(p);
      setLoadFailed(false);
    } catch (e) {
      if (__DEV__) console.warn('Could not load profile:', e);
      setLoadFailed(true);
    }
  }, [router]);

  // Not signed in (for example after refreshing the web version): go back to login.
  useEffect(() => {
    if (!getUid()) router.replace('/');
  }, [router]);

  // Load the profile whenever helper mode comes into view.
  useFocusEffect(
    useCallback(() => {
      if (getUid()) load();
    }, [load])
  );

  function jumpTo(i: number) {
    pageRef.current = i;
    setPage(i);
    translateX.stopAnimation();
    translateX.setValue(-i * SCREEN_WIDTH);
  }

  function springTo(i: number) {
    pageRef.current = i;
    setPage(i);
    Animated.spring(translateX, {
      toValue: -i * SCREEN_WIDTH,
      stiffness: 500,
      damping: 45,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const base = -pageRef.current * SCREEN_WIDTH;
        const next = Math.max(-LAST * SCREEN_WIDTH, Math.min(0, base + g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        let target = pageRef.current;
        if (g.dx < -SCREEN_WIDTH * 0.25 || g.vx < -0.5) {
          target = Math.min(LAST, pageRef.current + 1);
        } else if (g.dx > SCREEN_WIDTH * 0.25 || g.vx > 0.5) {
          target = Math.max(0, pageRef.current - 1);
        }
        springTo(target);
      },
    })
  ).current;

  return (
    <View style={styles.root}>
      <View style={styles.viewport} {...panResponder.panHandlers}>
        <Animated.View style={[styles.strip, { transform: [{ translateX }] }]}>
          <View style={styles.page}><HelperHome profile={profile} /></View>
          <View style={styles.page}><HelperGigs /></View>
          <View style={styles.page}><HelperEarnings /></View>
          <View style={styles.page}>
            <HelperAccount
              profile={profile}
              loadFailed={loadFailed}
              onRetry={load}
              onProfileChange={setProfile}
            />
          </View>
        </Animated.View>
      </View>

      <BottomNav index={page} onChange={jumpTo} tabs={TABS} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF7' },
  viewport: { flex: 1, overflow: 'hidden' },
  strip: { flex: 1, flexDirection: 'row', width: SCREEN_WIDTH * TABS.length },
  page: { width: SCREEN_WIDTH, flex: 1 },
});