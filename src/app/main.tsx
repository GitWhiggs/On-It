import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import BottomNav from '@/components/BottomNav';
import Home from '@/screens/Home';
import Jobs from '@/screens/Jobs';
import Account from '@/screens/Account';
import { HomeStateProvider } from '@/lib/HomeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PUSH_DURATION = 400;
const PUSH_EASING = Easing.out(Easing.cubic);

export default function Main() {
  return (
    <HomeStateProvider>
      <MainInner />
    </HomeStateProvider>
  );
}

function MainInner() {
  const [page, setPage] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const pageRef = useRef(0);
  const params = useLocalSearchParams<{ tab?: string; t?: string }>();

  const [unread, setUnread] = useState(true);

  const transitioningRef = useRef(false);

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

  // Return to the Home page by sliding the page strip to the RIGHT.
  function goHomeWithBack() {
    if (transitioningRef.current) return;
    transitioningRef.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pageRef.current = 0;
    setPage(0);

    Animated.timing(translateX, {
      toValue: 0,
      duration: PUSH_DURATION,
      easing: PUSH_EASING,
      useNativeDriver: true,
    }).start(() => {
      transitioningRef.current = false;
    });
  }

  useEffect(() => {
    if (params.tab === 'jobs') jumpTo(1);
    else if (params.tab === 'home') jumpTo(0);
    else if (params.tab === 'account') jumpTo(2);
  }, [params.tab, params.t]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !transitioningRef.current &&
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const base = -pageRef.current * SCREEN_WIDTH;
        const next = Math.max(-2 * SCREEN_WIDTH, Math.min(0, base + g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        let target = pageRef.current;
        if (g.dx < -SCREEN_WIDTH * 0.25 || g.vx < -0.5) {
          target = Math.min(2, pageRef.current + 1);
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
          <View style={styles.page}><Home /></View>
          <View style={styles.page}>
            <Jobs
              goHome={goHomeWithBack}
              unread={unread}
              onOpenChat={() => setUnread(false)}
            />
          </View>
          <View style={styles.page}><Account /></View>
        </Animated.View>
      </View>

      <BottomNav index={page} onChange={jumpTo} dots={unread ? [true] : []} />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF7' },
  viewport: { flex: 1, overflow: 'hidden' },
  strip: { flex: 1, flexDirection: 'row', width: SCREEN_WIDTH * 3 },
  page: { width: SCREEN_WIDTH, flex: 1 },
});