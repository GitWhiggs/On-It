import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { getAuth, signOut } from '@/lib/auth';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const C = {
  bg: '#FAFAF7',
  tile: '#F0EFEA',
  text: '#111111',
  textSecondary: '#5E5E5A',
  textMuted: '#9A9A94',
  blue: '#3B82F6',
};

// Fake profile for now. Later this comes from the signed-in account.
const PROFILE = { name: 'Cam M.', initials: 'CM', rating: '5.0' };

const TILES: { label: string; icon: IconName }[] = [
  { label: 'Favorites', icon: 'heart-outline' }, // saved helpers
  { label: 'Wallet', icon: 'wallet-outline' },
  { label: 'Addresses', icon: 'map-marker-outline' },
];

type Row = { label: string; sub?: string; icon: IconName; action?: 'help' | 'how' | 'signout' };
const ROWS: Row[] = [
  { label: 'Account settings', icon: 'cog-outline' },
  { label: 'Notifications', icon: 'bell-outline' },
  { label: 'Safety', sub: 'Trusted contacts and safety tips', icon: 'shield-check-outline' },
  { label: 'Promotions', icon: 'tag-outline' },
  { label: 'Help', sub: 'Chat with On-It Support', icon: 'lifebuoy', action: 'help' },
  { label: 'How On-It works', sub: '3 quick steps', icon: 'lightbulb-on-outline', action: 'how' },
  { label: 'Become a helper', sub: 'Earn money doing jobs near you', icon: 'briefcase-outline' },
  { label: 'About On-It', icon: 'information-outline' },
  { label: 'Sign out', icon: 'logout', action: 'signout' },
];

const HOW = [
  { title: 'Tell us what you need', sub: 'Pick the job, the place and the time.' },
  { title: 'A helper nearby accepts', sub: 'See their name, rating and when they’ll arrive.' },
  { title: 'Track it and confirm', sub: 'Message them, then tap “All good” when it’s done.' },
];

export default function Account() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showHow, setShowHow] = useState(false);

  // DM Sans: the closest free match to Uber's font (Uber Move is licensed to Uber only).
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const f = (weight: 'regular' | 'medium' | 'bold') =>
    fontsLoaded
      ? { fontFamily: { regular: 'DMSans_400Regular', medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' }[weight] }
      : { fontWeight: ({ regular: '400', medium: '500', bold: '700' } as const)[weight] };

  async function onRow(row: Row) {
    if (row.action === 'how') {
      setShowHow(true);
    } else if (row.action === 'help') {
      router.push({ pathname: '/chat/[id]', params: { id: '2', name: 'On-It Support' } });
    } else if (row.action === 'signout') {
      await signOut(getAuth());
      router.replace('/');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]}>
        {/* Name, verified badge, rating, photo */}
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[styles.name, f('bold')]} numberOfLines={1}>{PROFILE.name}</Text>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="check-circle" size={14} color={C.blue} />
              <Text style={[styles.badgeText, f('medium')]}>Phone verified</Text>
            </View>
            <Pressable style={styles.ratingLink} accessibilityRole="button">
              <Text style={[styles.ratingText, f('regular')]}>★ {PROFILE.rating} rating · View your profile</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={C.textSecondary} />
            </Pressable>
          </View>
          <Pressable style={styles.avatar} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <Text style={[styles.avatarText, f('bold')]}>{PROFILE.initials}</Text>
          </Pressable>
        </View>

        {/* Three quick tiles */}
        <View style={styles.tiles}>
          {TILES.map((t) => (
            <Pressable key={t.label} style={styles.tile} accessibilityRole="button">
              <MaterialCommunityIcons name={t.icon} size={26} color={C.text} />
              <Text style={[styles.tileText, f('medium')]} numberOfLines={1}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Promo card */}
        <Pressable style={styles.promo} accessibilityRole="button">
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.promoTitle, f('medium')]}>Invite friends</Text>
            <Text style={[styles.promoSub, f('regular')]}>They get money off their first job, and so do you.</Text>
          </View>
          <View style={styles.promoArt}>
            <MaterialCommunityIcons name="gift-outline" size={34} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Menu */}
        <View>
          {ROWS.map((row) => (
            <Pressable key={row.label} style={styles.row} onPress={() => onRow(row)} accessibilityRole="button">
              <MaterialCommunityIcons name={row.icon} size={24} color={C.text} style={styles.rowIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, f('regular')]}>{row.label}</Text>
                {row.sub && <Text style={[styles.rowSub, f('regular')]}>{row.sub}</Text>}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* How On-It works: small pop-up from the menu */}
      <Modal visible={showHow} transparent animationType="slide" onRequestClose={() => setShowHow(false)}>
        <View style={styles.modalWrap}>
          <Pressable style={styles.backdrop} onPress={() => setShowHow(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
            <Text style={[styles.sheetTitle, f('bold')]}>How On-It works</Text>
            {HOW.map((step, i) => (
              <View key={step.title} style={[styles.howRow, i > 0 && styles.howDivider]}>
                <View style={styles.howNum}>
                  <Text style={[styles.howNumText, f('bold')]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.howTitle, f('bold')]}>{step.title}</Text>
                  <Text style={[styles.howSub, f('regular')]}>{step.sub}</Text>
                </View>
              </View>
            ))}
            <Pressable style={styles.sheetBtn} onPress={() => setShowHow(false)} accessibilityRole="button">
              <Text style={[styles.sheetBtnText, f('bold')]}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingBottom: 4 },
  name: { color: C.text, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  badge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.tile, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8,
  },
  badgeText: { color: C.text, fontSize: 14 },
  ratingLink: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  ratingText: { color: C.textSecondary, fontSize: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 24 },

  tiles: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1, height: 84, borderRadius: 14, backgroundColor: C.tile,
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6,
  },
  tileText: { color: C.text, fontSize: 15 },

  promo: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: C.tile, borderRadius: 14, padding: 16,
  },
  promoTitle: { color: C.text, fontSize: 17 },
  promoSub: { color: C.textSecondary, fontSize: 15, lineHeight: 20 },
  promoArt: {
    width: 64, height: 64, borderRadius: 14, backgroundColor: C.text,
    alignItems: 'center', justifyContent: 'center',
  },

  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 10 },
  rowIcon: { width: 40 },
  rowTitle: { color: C.text, fontSize: 18 },
  rowSub: { color: C.textSecondary, fontSize: 14, marginTop: 2 },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  sheetTitle: { color: C.text, fontSize: 22, letterSpacing: -0.4, marginBottom: 4 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  howDivider: { borderTopWidth: 1, borderTopColor: '#ECEAE4' },
  howNum: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF3FE',
    alignItems: 'center', justifyContent: 'center',
  },
  howNumText: { color: C.blue, fontSize: 15 },
  howTitle: { color: C.text, fontSize: 16 },
  howSub: { color: C.textSecondary, fontSize: 14, marginTop: 2, lineHeight: 19 },
  sheetBtn: { marginTop: 12, backgroundColor: C.text, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  sheetBtnText: { color: '#fff', fontSize: 17 },
});
