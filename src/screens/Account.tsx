import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import Sheet from '@/components/Sheet';
import { getAuth, signOut } from '@/lib/auth';
import { useAppColors, AppColors } from '@/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type RowItem = {
  label: string;
  sub?: string;
  icon: IconName;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
  destructive?: boolean;
  hideChevron?: boolean;
};

// Fake profile for now. Later this comes from the signed-in account.
const PROFILE = { name: 'Cam M.', phone: '+1 (555) 123-4567', rating: '5.0', since: 'Nov 2026' };

const DANGER = '#D2463E';

const HOW = [
  { title: 'Tell us what you need', sub: 'Pick the job, the place and the time.' },
  { title: 'A helper nearby accepts', sub: 'See their name, rating and when they’ll arrive.' },
  { title: 'Track it and confirm', sub: 'Message them, then tap “All good” when it’s done.' },
];

export default function Account() {
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();

  const [showHow, setShowHow] = useState(false);
  const [notify, setNotify] = useState(true);

  const initials = PROFILE.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Placeholder for screens that don't exist yet.
  const soon = (what: string) => {
    Haptics.selectionAsync();
    Alert.alert(what, 'Coming soon.');
  };

  async function handleSignOut() {
    Haptics.selectionAsync();
    try {
      await signOut(getAuth());
    } catch (err) {
      console.error('Error signing out:', err);
    }
    router.replace('/');
  }

  function handleDelete() {
    Haptics.selectionAsync();
    Alert.alert(
      'Delete account?',
      'This permanently removes your account and job history. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: call the backend to delete the account and its data, then sign out.
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }

  const TILES: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: 'Payment', icon: 'credit-card-outline', onPress: () => soon('Payment methods') },
    { label: 'Addresses', icon: 'map-marker-outline', onPress: () => soon('Saved addresses') },
    { label: 'Safety', icon: 'shield-check-outline', onPress: () => soon('Safety') },
  ];

  const renderGroup = (title: string | null, rows: RowItem[]) => (
    <View style={styles.groupWrap}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.group}>
        {rows.map((row, i) => (
          <Pressable
            key={row.label}
            style={[styles.row, i < rows.length - 1 && styles.rowDivider]}
            onPress={row.onPress}
            disabled={!row.onPress}
            accessibilityRole={row.onSwitch ? 'switch' : 'button'}
            accessibilityLabel={row.label}
          >
            <MaterialCommunityIcons
              name={row.icon}
              size={22}
              color={row.destructive ? DANGER : C.textSecondary}
              style={styles.rowIcon}
            />
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, row.destructive && { color: DANGER }]}>{row.label}</Text>
              {!!row.sub && <Text style={styles.rowSub}>{row.sub}</Text>}
            </View>
            {row.onSwitch ? (
              <Switch value={row.switchValue} onValueChange={row.onSwitch} trackColor={{ true: C.accent }} />
            ) : (
              !row.hideChevron && <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMuted} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{PROFILE.name}</Text>
          <View style={styles.verifiedRow}>
            <MaterialCommunityIcons name="check-decagram" size={16} color={C.accent} />
            <Text style={styles.verifiedText}>Phone verified · {PROFILE.phone}</Text>
          </View>
          <Text style={styles.meta}>★ {PROFILE.rating} · Member since {PROFILE.since}</Text>
          <Pressable
            style={styles.editBtn}
            onPress={() => soon('Edit profile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Text style={styles.editBtnText}>Edit profile</Text>
          </Pressable>
        </View>

        {/* Work mode: the one dark card on this page */}
        <View style={styles.work}>
          <Text style={styles.workEyebrow}>Work mode</Text>
          <Text style={styles.workHead}>Earn money doing gigs near you.</Text>
          <Text style={styles.workSub}>Set your own hours. Get paid after every confirmed job.</Text>
          <Pressable
            style={styles.workBtn}
            onPress={() => soon('Become a helper')}
            accessibilityRole="button"
          >
            <Text style={styles.workBtnText}>Become a helper</Text>
          </Pressable>
        </View>

        {/* Quick tiles */}
        <View style={styles.tiles}>
          {TILES.map((t) => (
            <Pressable
              key={t.label}
              style={styles.tile}
              onPress={t.onPress}
              accessibilityRole="button"
              accessibilityLabel={t.label}
            >
              <MaterialCommunityIcons name={t.icon} size={24} color={C.text} />
              <Text style={styles.tileText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {renderGroup('Settings', [
          { label: 'Account settings', sub: 'Name, email, photo', icon: 'cog-outline', onPress: () => soon('Account settings') },
          {
            label: 'Notifications',
            icon: 'bell-outline',
            switchValue: notify,
            onSwitch: (value) => {
              Haptics.selectionAsync();
              setNotify(value);
            },
          },
        ])}

        {renderGroup('Support', [
          {
            label: 'Help',
            sub: 'Chat with On-It Support',
            icon: 'lifebuoy',
            onPress: () => {
              Haptics.selectionAsync();
              router.push({ pathname: '/chat/[id]', params: { id: '2', name: 'On-It Support' } });
            },
          },
          {
            label: 'How On-It works',
            sub: '3 quick steps',
            icon: 'lightbulb-on-outline',
            onPress: () => {
              Haptics.selectionAsync();
              setShowHow(true);
            },
          },
          { label: 'Report a problem', icon: 'flag-outline', onPress: () => soon('Report a problem') },
        ])}

        {renderGroup('Legal', [
          { label: 'Terms of Service', icon: 'file-document-outline', onPress: () => soon('Terms of Service') },
          { label: 'Privacy Policy', icon: 'shield-lock-outline', onPress: () => soon('Privacy Policy') },
        ])}

        {renderGroup(null, [
          { label: 'Sign out', icon: 'logout', onPress: handleSignOut, hideChevron: true },
          { label: 'Delete account', icon: 'trash-can-outline', onPress: handleDelete, destructive: true, hideChevron: true },
        ])}

        <Text style={styles.footer}>On-It · Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>

      {/* How On-It works */}
      <Sheet visible={showHow} onClose={() => setShowHow(false)}>
        <Text style={styles.sheetTitle}>How On-It works</Text>
        {HOW.map((step, i) => (
          <View key={step.title} style={[styles.howRow, i > 0 && styles.howDivider]}>
            <View style={styles.howNum}>
              <Text style={styles.howNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.howTitle}>{step.title}</Text>
              <Text style={styles.howSub}>{step.sub}</Text>
            </View>
          </View>
        ))}
        <Pressable style={[styles.cta, { marginTop: 16 }]} onPress={() => setShowHow(false)} accessibilityRole="button">
          <Text style={styles.ctaText}>Got it</Text>
        </Pressable>
      </Sheet>
    </SafeAreaView>
  );
}

const makeStyles = (C: AppColors) => {
  // Soft neutral fill that works on any background
  const TILE = 'rgba(120,118,110,0.12)';

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 150, gap: 24 },

    // Profile: centered, unlike the left-aligned pages
    profile: { alignItems: 'center', gap: 6, paddingTop: 8 },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    avatarText: { color: C.bg, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    name: { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    verifiedText: { color: C.textSecondary, fontSize: 14 },
    meta: { color: C.textMuted, fontSize: 13 },
    editBtn: { backgroundColor: TILE, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, marginTop: 8 },
    editBtnText: { color: C.text, fontSize: 15, fontWeight: '600' },

    // Work mode card (the single dark element)
    work: { backgroundColor: C.text, borderRadius: 20, padding: 20, gap: 8 },
    workEyebrow: { color: C.bg, opacity: 0.6, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
    workHead: { color: C.bg, fontSize: 26, fontWeight: '800', letterSpacing: -0.6, lineHeight: 30 },
    workSub: { color: C.bg, opacity: 0.7, fontSize: 15, lineHeight: 21 },
    workBtn: { alignSelf: 'flex-start', backgroundColor: C.bg, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 20, marginTop: 8 },
    workBtnText: { color: C.text, fontSize: 15, fontWeight: '700' },

    // Quick tiles
    tiles: { flexDirection: 'row', gap: 12 },
    tile: { flex: 1, height: 96, borderRadius: 20, backgroundColor: TILE, padding: 14, justifyContent: 'space-between' },
    tileText: { color: C.text, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

    // Grouped lists
    groupWrap: { gap: 8 },
    groupTitle: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', paddingHorizontal: 4 },
    group: { backgroundColor: TILE, borderRadius: 20, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 10, paddingHorizontal: 16 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    rowIcon: { width: 34 },
    rowText: { flex: 1 },
    rowLabel: { color: C.text, fontSize: 16, fontWeight: '500' },
    rowSub: { color: C.textSecondary, fontSize: 13, marginTop: 2 },

    footer: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 },

    // Sheet (same look as the pickers on Home)
    sheetTitle: { color: C.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
    howDivider: { borderTopWidth: 1, borderTopColor: C.border },
    howNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: TILE, alignItems: 'center', justifyContent: 'center' },
    howNumText: { color: C.text, fontSize: 15, fontWeight: '700' },
    howTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
    howSub: { color: C.textSecondary, fontSize: 14, marginTop: 2, lineHeight: 19 },
    cta: { backgroundColor: C.text, borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
    ctaText: { color: C.bg, fontSize: 17, fontWeight: '700' },
  });
};