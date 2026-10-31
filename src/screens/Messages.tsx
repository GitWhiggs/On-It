import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function Messages() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.sub}>Chats with your helper will show up here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAF7' },
  content: { paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  title: { color: '#111111', fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  sub: { color: '#5E5E5A', fontSize: 18 },
});