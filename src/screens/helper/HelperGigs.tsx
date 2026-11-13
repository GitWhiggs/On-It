// Helper Gigs tab. Empty for now: accepted gigs will show up here.
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const C = {
  bg: '#FAFAF7',
  text: '#111111',
  textSecondary: '#5E5E5A',
};

export default function HelperGigs() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>Gigs</Text>
        <View style={styles.emptyBody}>
          <Text style={styles.emptyHead}>No gigs yet.</Text>
          <Text style={styles.emptySub}>Gigs you accept will show up here.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 130 },
  title: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  emptyBody: { flex: 1, justifyContent: 'center', gap: 12 },
  emptyHead: { color: C.text, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  emptySub: { color: C.textSecondary, fontSize: 17, lineHeight: 24, maxWidth: 300 },
});
