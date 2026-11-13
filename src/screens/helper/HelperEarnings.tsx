// Helper Earnings tab. Empty for now: pay will show up here after the first gig.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const C = {
  bg: '#FAFAF7',
  tile: '#EFEDE7',
  text: '#111111',
};

export default function HelperEarnings() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Earnings</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Ready to cash out</Text>
          <Text style={styles.amount}>$0.00</Text>
          <Text style={styles.cardSub}>Your pay shows up here after your first gig.</Text>
        </View>

        <Text style={styles.note}>
          You keep 100% of every gig and tip. On-It’s fee is paid by the customer.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 150, gap: 20 },
  title: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  card: { backgroundColor: C.text, borderRadius: 20, padding: 20, gap: 12 },
  cardLabel: { color: '#A8A8A2', fontSize: 14, fontWeight: '600' },
  amount: { color: '#FFFFFF', fontSize: 44, fontWeight: '800', letterSpacing: -1.2, lineHeight: 48 },
  cardSub: { color: '#C9C9C3', fontSize: 15, lineHeight: 21 },
  note: {
    backgroundColor: C.tile,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    overflow: 'hidden',
  },
});
