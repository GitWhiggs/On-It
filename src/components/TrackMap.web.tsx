import { StyleSheet, Text, View } from 'react-native';

interface TrackMapProps {
  step?: number;
  helper?: 'none' | 'away' | 'here';
  onActionPress?: () => void;
}

export default function TrackMap(_props: TrackMapProps) {
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
    height: 160,
  },
  text: { color: '#9A9A94', fontSize: 14, fontWeight: '600' },
});