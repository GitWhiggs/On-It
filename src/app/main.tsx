import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import BottomNav from '@/components/BottomNav';
import Home from '@/screens/Home';
import Jobs from '@/screens/Jobs';
import Messages from '@/screens/Messages';
import Account from '@/screens/Account';

export default function Main() {
  const pager = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

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
          <Jobs goHome={() => go(0)} />
        </View>
        <View key="messages" style={styles.page}>
          <Messages />
        </View>
        <View key="account" style={styles.page}>
          <Account />
        </View>
      </PagerView>

      <BottomNav index={page} onChange={go} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF7' },
  pager: { flex: 1 },
  page: { flex: 1 },
});