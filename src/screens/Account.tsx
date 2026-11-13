
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Sheet from '@/components/Sheet';
import { getAuth, signOut, getUid } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { setMode } from '@/lib/profile';
import { useAppColors, AppColors } from '@/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Profile = {
  first_name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  mode: 'customer' | 'helper';
  helper_onboarded_at: string | null;
};

type Row = {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
};

const AVATAR_BUCKET = 'profile-avatars';

const HOW = [
  {
    title: 'Tell us what you need',
    sub: 'Pick the job, the place and the time.',
  },
  {
    title: 'A helper accepts',
    sub: 'See their name and when they’ll arrive.',
  },
  {
    title: 'Track it and confirm',
    sub: 'Message them, then confirm when the job is done.',
  },
];

function formatPhoneNumber(phone: string | null | undefined) {
  if (!phone) return 'Phone number unavailable';

  const digits = phone.replace(/\D/g, '');

  // Format US numbers stored in international E.164 format.
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

export default function Account() {
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const uid = getUid();
    const firebasePhone = getAuth().currentUser?.phoneNumber ?? null;

    if (!uid) {
      setProfile(null);
      setLoadError('You’re signed out. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, email, phone_number, avatar_url, mode, helper_onboarded_at')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setProfile(null);
        setLoadError('Your profile hasn’t been set up yet.');
        return;
      }

      const next: Profile = {
        first_name: data.first_name ?? '',
        email: data.email ?? null,
        phone_number: data.phone_number ?? null,
        avatar_url: data.avatar_url ?? null,
        mode: data.mode === 'helper' ? 'helper' : 'customer',
        helper_onboarded_at: data.helper_onboarded_at ?? null,
      };

      setProfile(next);
      setName(next.first_name);
      setEmail(next.email ?? '');

      // Sync the authenticated Firebase phone number to this user's profile.
      // The UID filter prevents updating another user's row.
      if (
        firebasePhone &&
        firebasePhone !== next.phone_number
      ) {
        const { error: phoneError } = await supabase
          .from('profiles')
          .update({ phone_number: firebasePhone })
          .eq('user_id', uid);

        if (phoneError) {
          console.error('Phone number sync failed:', phoneError);
        } else {
          next.phone_number = firebasePhone;
          setProfile({ ...next });
        }
      }
    } catch (error) {
      console.error('Account profile load failed:', error);
      setLoadError('Couldn’t load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const phone = formatPhoneNumber(
    getAuth().currentUser?.phoneNumber ?? profile?.phone_number
  );

  const displayName = profile?.first_name?.trim() || 'Your account';

  const initials =
    displayName === 'Your account'
      ? '?'
      : displayName.slice(0, 1).toUpperCase();

  async function choosePhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          'Allow access to your photo library to choose a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setAvatarUri(result.assets[0].uri);
      await Haptics.selectionAsync();
    } catch (error) {
      console.error('Photo selection failed:', error);
      Alert.alert('Couldn’t choose photo', 'Please try again.');
    }
  }

  async function uploadAvatar(uid: string, uri: string) {
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error('Could not read the selected image.');
    }

    const imageData = await response.arrayBuffer();
    const contentType = 'image/jpeg';
    const filePath = `${uid}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, imageData, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    // Add a changing query value so the app refreshes an updated picture.
    return `${data.publicUrl}?updated=${Date.now()}`;
  }

  async function saveProfile() {
    const uid = getUid();
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!uid) {
      Alert.alert('Sign-in required', 'Please sign in again.');
      return;
    }

    if (!cleanName) {
      Alert.alert('Name required', 'Please enter your first name.');
      return;
    }

    if (cleanName.length > 40) {
      Alert.alert(
        'Name too long',
        'Your name must be 40 characters or fewer.'
      );
      return;
    }

    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      Alert.alert(
        'Check your email',
        'Enter a valid email address or leave it blank.'
      );
      return;
    }

    const previous = profile;
    setSaving(true);

    try {
      let avatarUrl = profile?.avatar_url ?? null;

      if (avatarUri) {
        avatarUrl = await uploadAvatar(uid, avatarUri);
      }

      const firebasePhone = getAuth().currentUser?.phoneNumber ?? null;

      const updated: Profile = {
        first_name: cleanName,
        email: cleanEmail || null,
        phone_number: firebasePhone ?? profile?.phone_number ?? null,
        avatar_url: avatarUrl,
        mode: profile?.mode ?? 'customer',
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: cleanName,
          email: cleanEmail || null,
          phone_number: updated.phone_number,
          avatar_url: avatarUrl,
        })
        .eq('user_id', uid);

      if (error) throw error;

      setProfile(updated);
      setAvatarUri(null);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      setShowEdit(false);
    } catch (error) {
      console.error('Profile update failed:', error);
      setProfile(previous);

      Alert.alert(
        'Couldn’t save changes',
        'Please try again. Your existing profile has been kept.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await Haptics.selectionAsync();

    try {
      await signOut(getAuth());
      router.replace('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      Alert.alert('Couldn’t sign out', 'Please try again.');
    }
  }

  async function handleWorkMode() {
    if (!profile) {
      Alert.alert('Profile unavailable', 'Load your account profile before switching modes.');
      return;
    }

    await Haptics.selectionAsync();

    if (profile.mode === 'helper' && !profile.helper_onboarded_at) {
      router.push('/become-helper');
      return;
    }

    if (profile.mode === 'helper') {
      try {
        await setMode('customer');
        router.replace('/main');
      } catch (error) {
        console.error('Could not switch to customer mode:', error);
        Alert.alert('Could not switch modes', 'Please check your connection and try again.');
      }
      return;
    }

    if (!profile.helper_onboarded_at) {
      router.push('/become-helper');
      return;
    }

    try {
      await setMode('helper');
      router.replace('/helper');
    } catch (error) {
      console.error('Could not switch to helper mode:', error);
      Alert.alert('Could not switch modes', 'Please check your connection and try again.');
    }
  }

  const soon = (label: string) => {
    Haptics.selectionAsync();
    Alert.alert(label, 'This section isn’t available yet.');
  };

  const sections: { title?: string; rows: Row[] }[] = [
    {
      title: 'Account',
      rows: [
        {
          label: 'Payment',
          icon: 'credit-card-outline',
          onPress: () => soon('Payment'),
        },
        {
          label: 'Addresses',
          icon: 'map-marker-outline',
          onPress: () => soon('Addresses'),
        },
        {
          label: 'Safety',
          icon: 'shield-check-outline',
          onPress: () => soon('Safety'),
        },
        {
          label: 'Notifications',
          icon: 'bell-outline',
          onPress: () => soon('Notifications'),
        },
        {
          label:
            profile?.mode === 'helper' && profile.helper_onboarded_at
              ? 'Switch to customer mode'
              : profile?.mode === 'helper'
                ? 'Finish helper sign-up'
                : profile?.helper_onboarded_at
                  ? 'Switch to helper mode'
                  : 'Become a helper',
          icon: 'swap-horizontal',
          onPress: handleWorkMode,
        },
      ],
    },
    {
      title: 'Support',
      rows: [
        {
          label: 'Help',
          icon: 'lifebuoy',
          onPress: () =>
            router.push({
              pathname: '/chat/[id]',
              params: { id: '2', name: 'On-It Support' },
            }),
        },
        {
          label: 'How On-It works',
          icon: 'lightbulb-on-outline',
          onPress: () => setShowHow(true),
        },
      ],
    },
    {
      title: 'Legal',
      rows: [
        {
          label: 'Terms of Service',
          icon: 'file-document-outline',
          onPress: () => soon('Terms of Service'),
        },
        {
          label: 'Privacy Policy',
          icon: 'shield-lock-outline',
          onPress: () => soon('Privacy Policy'),
        },
      ],
    },
    {
      rows: [
        {
          label: 'Sign out',
          icon: 'logout',
          onPress: handleSignOut,
        },
        {
          label: 'Delete account',
          icon: 'trash-can-outline',
          destructive: true,
          onPress: () =>
            Alert.alert(
              'Delete account',
              'Account deletion is not available yet. Contact On-It Support for help.'
            ),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account</Text>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>

          <View style={styles.profileInfo}>
            {loading ? (
              <ActivityIndicator size="small" color={C.accent} />
            ) : (
              <>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.phone}>{phone}</Text>
                {!!profile?.email && (
                  <Text style={styles.email}>{profile.email}</Text>
                )}
              </>
            )}
          </View>

          <Pressable
            style={styles.editButton}
            onPress={() => {
              setName(profile?.first_name ?? '');
              setEmail(profile?.email ?? '');
              setAvatarUri(null);
              setShowEdit(true);
            }}
            disabled={!profile}
          >
            <Text
              style={[
                styles.editText,
                !profile && styles.disabledText,
              ]}
            >
              Edit
            </Text>
          </Pressable>
        </View>

        {!!loadError && (
          <Pressable onPress={loadProfile}>
            <Text style={styles.errorText}>
              {loadError} Tap to retry.
            </Text>
          </Pressable>
        )}

        {sections.map((section, sectionIndex) => (
          <View
            key={section.title ?? `section-${sectionIndex}`}
            style={styles.section}
          >
            {!!section.title && (
              <Text style={styles.sectionTitle}>
                {section.title}
              </Text>
            )}

            <View style={styles.list}>
              {section.rows.map((row, i) => (
                <Pressable
                  key={row.label}
                  style={[
                    styles.row,
                    i < section.rows.length - 1 &&
                      styles.rowDivider,
                  ]}
                  onPress={row.onPress}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name={row.icon}
                    size={21}
                    color={
                      row.destructive
                        ? '#D2463E'
                        : C.textSecondary
                    }
                    style={styles.rowIcon}
                  />

                  <Text
                    style={[
                      styles.rowLabel,
                      row.destructive && styles.destructive,
                    ]}
                  >
                    {row.label}
                  </Text>

                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={C.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>
          On-It · Version {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>

      <Sheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
      >
        <Text style={styles.sheetTitle}>Edit profile</Text>

        <Pressable
          style={styles.photoPicker}
          onPress={choosePhoto}
        >
          <View style={styles.photoPreview}>
            {avatarUri || profile?.avatar_url ? (
              <Image
                source={{
                  uri: avatarUri ?? profile?.avatar_url ?? undefined,
                }}
                style={styles.photoPreviewImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>

          <View style={styles.photoPickerText}>
            <Text style={styles.photoPickerTitle}>
              Change profile photo
            </Text>
            <Text style={styles.photoPickerSub}>
              Choose a picture from your library
            </Text>
          </View>

          <MaterialCommunityIcons
            name="image-plus-outline"
            size={22}
            color={C.textSecondary}
          />
        </Pressable>

        <Text style={styles.fieldLabel}>First name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={40}
          autoCapitalize="words"
          placeholder="Your name"
          placeholderTextColor={C.textMuted}
          style={styles.input}
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Email (optional)</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          placeholderTextColor={C.textMuted}
          style={styles.input}
        />

        <Pressable
          style={[
            styles.saveButton,
            saving && styles.saveDisabled,
          ]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Text style={styles.saveText}>Save changes</Text>
          )}
        </Pressable>
      </Sheet>

      <Sheet
        visible={showHow}
        onClose={() => setShowHow(false)}
      >
        <Text style={styles.sheetTitle}>How On-It works</Text>

        {HOW.map((step, i) => (
          <View
            key={step.title}
            style={[
              styles.howRow,
              i > 0 && styles.howDivider,
            ]}
          >
            <View style={styles.howNumber}>
              <Text style={styles.howNumberText}>
                {i + 1}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.howTitle}>
                {step.title}
              </Text>
              <Text style={styles.howSub}>
                {step.sub}
              </Text>
            </View>
          </View>
        ))}

        <Pressable
          style={styles.saveButton}
          onPress={() => setShowHow(false)}
        >
          <Text style={styles.saveText}>Got it</Text>
        </Pressable>
      </Sheet>
    </SafeAreaView>
  );
}

const makeStyles = (C: AppColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: C.bg,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 150,
      gap: 22,
    },
    title: {
      color: C.text,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.7,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 8,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: C.text,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      color: C.bg,
      fontSize: 23,
      fontWeight: '800',
    },
    profileInfo: {
      flex: 1,
      gap: 3,
    },
    name: {
      color: C.text,
      fontSize: 18,
      fontWeight: '700',
    },
    phone: {
      color: C.textSecondary,
      fontSize: 13,
    },
    email: {
      color: C.textMuted,
      fontSize: 13,
    },
    editButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    editText: {
      color: C.text,
      fontSize: 14,
      fontWeight: '600',
    },
    disabledText: {
      color: C.textMuted,
    },
    errorText: {
      color: '#B42318',
      fontSize: 13,
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      paddingHorizontal: 2,
    },
    list: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
      overflow: 'hidden',
    },
    row: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      gap: 12,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
    },
    rowIcon: {
      width: 25,
    },
    rowLabel: {
      flex: 1,
      color: C.text,
      fontSize: 15,
      fontWeight: '500',
    },
    destructive: {
      color: '#D2463E',
    },
    footer: {
      color: C.textMuted,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 2,
    },
    sheetTitle: {
      color: C.text,
      fontSize: 21,
      fontWeight: '800',
      marginBottom: 18,
    },
    photoPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      paddingVertical: 12,
      marginBottom: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
    },
    photoPreview: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: C.text,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoPreviewImage: {
      width: '100%',
      height: '100%',
    },
    photoPickerText: {
      flex: 1,
      gap: 3,
    },
    photoPickerTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '600',
    },
    photoPickerSub: {
      color: C.textMuted,
      fontSize: 12,
    },
    fieldLabel: {
      color: C.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 7,
    },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      color: C.text,
      borderRadius: 13,
      paddingHorizontal: 14,
      fontSize: 16,
      marginBottom: 16,
    },
    saveButton: {
      backgroundColor: C.text,
      borderRadius: 999,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    saveDisabled: {
      opacity: 0.6,
    },
    saveText: {
      color: C.bg,
      fontSize: 16,
      fontWeight: '700',
    },
    howRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 15,
    },
    howDivider: {
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    howNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    howNumberText: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    howTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '700',
    },
    howSub: {
      color: C.textSecondary,
      fontSize: 14,
      marginTop: 2,
      lineHeight: 19,
    },
  });
