import { StyleSheet, Text, View } from 'react-native';

export default function TrackMap(_props: { helper?: 'none' | 'away' | 'here' }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>The map shows on the phone</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1, borderRadius: 12, backgroundColor: '#EDEBE5',
    alignItems: 'center', justifyContent: 'center',
  },
  text: { color: '#9A9A94', fontSize: 14, fontWeight: '600' },
});