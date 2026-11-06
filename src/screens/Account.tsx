import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const C = {
  bg: '#FAFAF7',
  tile: '#EFEDE7',
  line: '#E4E2DB',
  text: '#111111',
  textSecondary: '#5E5E5A',
  accent: '#3B83F6',
};

const QUICK_ACTIONS = [
  { label: 'Favorites', icon: 'heart-outline' as const },
  { label: 'Wallet', icon: 'wallet-outline' as const },
  { label: 'Addresses', icon: 'map-marker-outline' as const },
];

const MENU_ITEMS = [
  { label: 'Account settings', icon: 'cog-outline' as const },
  { label: 'Help & support', icon: 'lifebuoy' as const },
  { label: 'About On-It', icon: 'information-outline' as const },
];

export default function Account() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.profile}>
            <Text style={styles.name}>Cam M.</Text>
            <View style={styles.verified}>
              <MaterialCommunityIcons name="check-circle" size={15} color={C.accent} />
              <Text style={styles.verifiedText}>Phone verified</Text>
            </View>
            <Text style={styles.rating}>★ 5.0 rating · View your profile</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>CM</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((item) => (
            <Pressable key={item.label} style={styles.actionButton}>
              <MaterialCommunityIcons name={item.icon} size={25} color={C.text} />
              <Text style={styles.actionLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.label}
              style={[styles.menuRow, index === MENU_ITEMS.length - 1 && styles.lastMenuRow]}
            >
              <MaterialCommunityIcons name={item.icon} size={23} color={C.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={21} color={C.textSecondary} />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 105,
    gap: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profile: {
    flex: 1,
    gap: 8,
  },
  name: {
    color: C.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  verified: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.tile,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  verifiedText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
  },
  rating: {
    color: C.textSecondary,
    fontSize: 16,
    marginTop: 2,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: C.tile,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 5,
  },
  actionLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  menu: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  menuRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  lastMenuRow: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    flex: 1,
    color: C.text,
    fontSize: 17,
    fontWeight: '500',
  },
});
