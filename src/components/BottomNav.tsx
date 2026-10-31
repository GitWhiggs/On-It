import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const C = {
  surface: '#FFFFFF',
  border: '#DAD8D1',
  text: '#111111',
  textMuted: '#9A9A94',
};

// Messages and Account have no screens yet, so they don't navigate.
const TABS = [
  { label: 'Home', icon: 'home', path: '/home' },
  { label: 'Jobs', icon: 'briefcase-outline', path: '/jobs' },
  { label: 'Messages', icon: 'message-outline', path: null },
  { label: 'Account', icon: 'account-outline', path: null },
] as const;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.nav}>
      {TABS.map((tab) => {
        const active = tab.path === pathname;
        const color = active ? C.text : C.textMuted;
        return (
          <Pressable
            key={tab.label}
            style={styles.item}
            onPress={() => tab.path && !active && router.replace(tab.path as any)}
          >
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
    position: 'absolute', left: 16, right: 16, bottom: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderColor: C.border, borderWidth: 1,
    borderRadius: 28, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 11, fontWeight: '600' },
});