import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useLocalSearchParams } from 'expo-router';
import BottomNav from '@/components/BottomNav';
import Home from '@/screens/Home';
import Jobs from '@/screens/Jobs';
import Account from '@/screens/Account';

export default function Main() {
  const pager = useRef<PagerView>(null);
  const [page, setPage] = useState(0);
  const params = useLocalSearchParams<{ tab?: string; t?: string }>();
  
  // Fake for now: Marcus sent a message you haven't read. Shows a dot on the Jobs tab.
  const [unread, setUnread] = useState(true);

  // Handle incoming tab navigation params (e.g., jumping to jobs after payment)
  useEffect(() => {
    if (params.tab === 'jobs') {
      pager.current?.setPageWithoutAnimation(1);
      setPage(1);
    } else if (params.tab === 'home') {
      pager.current?.setPageWithoutAnimation(0);
      setPage(0);
    } else if (params.tab === 'account') {
      pager.current?.setPageWithoutAnimation(2);
      setPage(2);
    }
  }, [params.tab, params.t]); // Now fully typed and happy!

  // Tapping a tab jumps there instantly. Swiping follows your finger.
  function go(i: number) {
    pager.current?.setPageWithoutAnimation(i);
    setPage(i);
  }

  return (
    <View style={styles.root}>
      <PagerView
        ref={pager}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        <View key="home" style={styles.page}>
          <Home />
        </View>
        <View key="jobs" style={styles.page}>
          <Jobs goHome={() => go(0)} unread={unread} onOpenChat={() => setUnread(false)} />
        </View>
        <View key="account" style={styles.page}>
          <Account />
        </View>
      </PagerView>

      <BottomNav index={page} onChange={go} dots={unread ? [1] : []} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF7' },
  pager: { flex: 1 },
  page: { flex: 1 },
});