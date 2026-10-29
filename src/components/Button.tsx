// The big blue button used across the app.
import { Pressable, StyleSheet, Text } from 'react-native';
import { BLUE } from '@/theme';

type Props = { label: string; onPress: () => void; disabled?: boolean };

export default function Button({ label, onPress, disabled = false }: Props) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.off]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  off: { opacity: 0.4 },
  text: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
