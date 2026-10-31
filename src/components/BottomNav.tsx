import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const C = {
  surface: '#FFFFFF',
  border: '#DAD8D1',
  text: '#111111',
  textMuted: '#9A9A94',
};

const TABS: { label: string; icon: IconName }[] = [
  { label: 'Home', icon: 'home' },
  { label: 'Jobs', icon: 'briefcase-outline' },
  { label: 'Messages', icon: 'message-outline' },
  { label: 'Account', icon: 'account-outline' },
];

export default function BottomNav({
  index,
  onChange,
}: {
  index: number;
  onChange: (i: number) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.nav, { bottom: insets.bottom + 20 }]}>
      {TABS.map((tab, i) => {
        const color = i === index ? C.text : C.textMuted;
        return (
          <Pressable key={tab.label} style={styles.item} onPress={() => onChange(i)}>
            <MaterialCommunityIcons name={tab.icon} size={24} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderColor: C.border, borderWidth: 1,
    borderRadius: 28, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 11, fontWeight: '600' },
});