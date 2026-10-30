import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Design tokens (hex fallbacks of the Display P3 palette)
const C = {
  bg: '#0A0E1A',
  surface1: '#111728',
  surface2: '#172036',
  surface3: '#1F2A45',
  border: '#2A3558',
  text: '#F2F5FF',
  textSecondary: '#9AA6C4',
  textMuted: '#66728F',
  primary: '#4D7CFF',
  success: '#2EF2A0',
  glowPrimary: '#4D7CFF',
};

const CATEGORIES: { label: string; icon: IconName }[] = [
  { label: 'Moving', icon: 'truck-outline' },
  { label: 'Yard', icon: 'sprout-outline' },
  { label: 'Events', icon: 'party-popper' },
  { label: 'Errands', icon: 'shopping-outline' },
  { label: 'Seasonal', icon: 'snowflake' },
];

const HELPERS = [
  { name: 'Marcus V.', info: '4.94 · 3 jobs with you', away: '~8 min away' },
  { name: 'Dana R.', info: '4.97 · 1 job with you', away: '~12 min away' },
];

export default function Home() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.logo}>On-It</Text>
          <View style={styles.pill}>
            <View style={styles.dot} />
            <Text style={styles.pillText}>18 helpers nearby</Text>
          </View>
        </View>

        <View>
          <Text style={styles.help}>Help at</Text>
          <Text style={styles.address}>Your address ▾</Text>
        </View>

        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={20} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you need done?"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.label} style={styles.cat}>
              <View style={styles.catIcon}>
                <MaterialCommunityIcons name={c.icon} size={28} color={C.primary} />
              </View>
              <Text style={styles.catLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Your helpers</Text>
          <Text style={styles.edit}>Edit</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.helpers}>
          {HELPERS.map((h) => (
            <View key={h.name} style={styles.helperCard}>
              <View style={styles.helperTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{h.name[0]}</Text>
                </View>
                <View>
                  <Text style={styles.helperName}>{h.name}</Text>
                  <Text style={styles.helperInfo}>{h.info}</Text>
                </View>
              </View>
              <View style={styles.helperBottom}>
                <Text style={styles.away}>{h.away}</Text>
                <Pressable style={styles.bookBtn}>
                  <Text style={styles.bookText}>Book again</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      <View style={styles.nav}>
        <NavItem icon="home" label="Home" active />
        <NavItem icon="briefcase-outline" label="Jobs" />
        <View style={styles.plusSlot}>
          <Pressable style={styles.plus}>
            <MaterialCommunityIcons name="plus" size={30} color="#fff" />
          </Pressable>
        </View>
        <NavItem icon="message-outline" label="Messages" />
        <NavItem icon="account-outline" label="Account" />
      </View>
    </SafeAreaView>
  );
}

function NavItem({ icon, label, active }: { icon: IconName; label: string; active?: boolean }) {
  const color = active ? C.primary : C.textMuted;
  return (
    <Pressable style={styles.navItem}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[styles.navLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, gap: 20, paddingBottom: 130 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { color: C.text, fontSize: 28, fontWeight: '800' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface1, borderColor: C.border, borderWidth: 1,
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.success },
  pillText: { color: C.text, fontSize: 12, fontWeight: '600' },

  help: { color: C.textSecondary, fontSize: 13 },
  address: { color: C.text, fontSize: 22, fontWeight: '700' },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface1, borderColor: C.border, borderWidth: 1,
    borderRadius: 16, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: C.text, paddingVertical: 14, fontSize: 16 },

  cats: { gap: 14 },
  cat: { alignItems: 'center', gap: 8 },
  catIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { color: C.text, fontSize: 12, fontWeight: '600' },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { color: C.text, fontSize: 20, fontWeight: '700' },
  edit: { color: C.textSecondary, fontSize: 14, textDecorationLine: 'underline' },

  helpers: { gap: 12 },
  helperCard: {
    width: 260, backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1,
    borderRadius: 20, padding: 16, gap: 16,
  },
  helperTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: C.text, fontSize: 18, fontWeight: '700' },
  helperName: { color: C.text, fontSize: 16, fontWeight: '700' },
  helperInfo: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  helperBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  away: { color: C.success, fontSize: 13, fontWeight: '600' },
  bookBtn: { backgroundColor: C.primary, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  bookText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  nav: {
    position: 'absolute', left: 16, right: 16, bottom: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface3, borderColor: C.border, borderWidth: 1,
    borderRadius: 28, paddingVertical: 10,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 2 },
  navLabel: { fontSize: 11, fontWeight: '600' },
  plusSlot: { flex: 1, alignItems: 'center' },
  plus: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: -30,
    shadowColor: C.glowPrimary, shadowOpacity: 0.6, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
});