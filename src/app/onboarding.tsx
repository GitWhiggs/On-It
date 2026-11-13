import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Button from '@/components/Button';
import { getAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAppColors, AppColors } from '@/theme';

const CATEGORIES = ['Moving', 'Yard work', 'Events', 'Errands', 'Seasonal'];
type Mode = 'customer' | 'helper';

export default function Onboarding() {
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [vehicle, setVehicle] = useState<'none' | 'car' | 'truck'>('none');
  const [busy, setBusy] = useState(false);

  function toggleCategory(category: string) {
    setCategories((current) => current.includes(category) ? current.filter((v) => v !== category) : [...current, category]);
  }

  async function finish() {
    const user = getAuth().currentUser;
    if (!user) { Alert.alert('Sign-in required', 'Please verify your phone number again.'); router.replace('/'); return; }
    if (!firstName.trim()) { Alert.alert('Add your name', 'Enter your first name to continue.'); return; }
    if (!mode) { Alert.alert('Choose how to use On-It', 'Select I need help or I want to earn as a helper.'); return; }
    if (mode === 'helper' && categories.length === 0) { Alert.alert('Choose a category', 'Select at least one type of help you can provide.'); return; }
    if (mode === 'helper' && !city.trim()) { Alert.alert('Add your city', 'Helpers need a city so we know where they work.'); return; }

    setBusy(true);
    try {
      // New accounts only: users who already have a profile never reach this screen.
      // Timestamps (created_at / updated_at) are set by the database, not the client.
      const { error } = await supabase.from('profiles').insert({
        user_id: user.uid,
        first_name: firstName.trim(),
        mode,
        helper_categories: mode === 'helper' ? categories : [],
        helper_city: mode === 'helper' ? city.trim() : null,
        helper_vehicle: mode === 'helper' ? vehicle : 'none',
        helper_radius_miles: 10,
        helper_availability: 'online',
        helper_alerts: true,
        helper_onboarded_at: mode === 'helper' ? new Date().toISOString() : null,
      });
      // 23505 = unique violation: a profile already exists (e.g. double tap). Treat as success.
      if (error && error.code !== '23505') throw error;
      router.replace(mode === 'helper' ? '/helper' : '/main');
    } catch (error) {
      console.error('Onboarding save failed:', error);
      Alert.alert('Could not save your account', 'Please check your connection and try again.');
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>OnIt</Text>
          <Text style={styles.title}>Let's get you set up.</Text>
          <Text style={styles.subtitle}>First, what should we call you?</Text>
          <TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={C.textMuted} autoCapitalize="words" returnKeyType="done" style={styles.input} accessibilityLabel="First name" />

          <Text style={styles.sectionTitle}>How do you want to use On-It?</Text>
          <Choice title="I need help" subtitle="Book someone for a task." selected={mode === 'customer'} onPress={() => setMode('customer')} styles={styles} />
          <Choice title="I want to earn as a helper" subtitle="Help people nearby and get paid." selected={mode === 'helper'} onPress={() => setMode('helper')} styles={styles} />

          {mode === 'helper' && <View style={styles.helperSection}>
            <Text style={styles.sectionTitle}>What can you help with?</Text>
            <Text style={styles.hint}>Choose all that apply.</Text>
            <View style={styles.chips}>{CATEGORIES.map((category) => <Pressable key={category} onPress={() => toggleCategory(category)} style={[styles.chip, categories.includes(category) && styles.chipSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: categories.includes(category) }}><Text style={[styles.chipText, categories.includes(category) && styles.chipTextSelected]}>{category}</Text></Pressable>)}</View>
            <Text style={styles.sectionTitle}>What city are you based in?</Text>
            <TextInput value={city} onChangeText={setCity} placeholder="e.g. Storrs" placeholderTextColor={C.textMuted} autoCapitalize="words" style={styles.input} accessibilityLabel="Helper city" />
            <Text style={styles.sectionTitle}>Do you have a vehicle?</Text>
            <View style={styles.vehicleRow}>{(['none', 'car', 'truck'] as const).map((v) => <Pressable key={v} onPress={() => setVehicle(v)} style={[styles.vehicle, vehicle === v && styles.vehicleSelected]}><Text style={[styles.vehicleText, vehicle === v && styles.vehicleTextSelected]}>{v === 'none' ? 'No vehicle' : v === 'car' ? 'Car' : 'Truck'}</Text></Pressable>)}</View>
          </View>}
          <Button label={busy ? 'Saving…' : 'Continue'} onPress={finish} disabled={busy || !firstName.trim() || !mode} />
          <Text style={styles.footnote}>This sets your starting experience. You’ll be able to change modes from Account settings in a later update.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Choice({ title, subtitle, selected, onPress, styles }: { title: string; subtitle: string; selected: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles> }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]} accessibilityRole="radio" accessibilityState={{ selected }}><View style={{ flex: 1 }}><Text style={styles.choiceTitle}>{title}</Text><Text style={styles.choiceSubtitle}>{subtitle}</Text></View><View style={[styles.radio, selected && styles.radioSelected]} /></Pressable>;
}

const makeStyles = (C: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 40, gap: 12 },
  brand: { color: C.accent, fontSize: 32, fontWeight: '800', marginBottom: 10 }, title: { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: C.textSecondary, fontSize: 16, marginTop: 4 }, input: { height: 54, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, color: C.text, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, marginBottom: 8 },
  sectionTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginTop: 10 }, hint: { color: C.textMuted, fontSize: 13, marginTop: -8 },
  choice: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 16, padding: 16, gap: 12 }, choiceSelected: { borderColor: C.accent, borderWidth: 2 },
  choiceTitle: { color: C.text, fontSize: 16, fontWeight: '700' }, choiceSubtitle: { color: C.textSecondary, fontSize: 13, marginTop: 3 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.textMuted }, radioSelected: { borderColor: C.accent, backgroundColor: C.accent, borderWidth: 5 },
  helperSection: { gap: 10, marginTop: 4 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 }, chipSelected: { borderColor: C.accent, backgroundColor: C.accent }, chipText: { color: C.text, fontWeight: '600', fontSize: 14 }, chipTextSelected: { color: '#FFFFFF' },
  vehicleRow: { flexDirection: 'row', gap: 8 }, vehicle: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 12, backgroundColor: C.surface }, vehicleSelected: { backgroundColor: C.accent, borderColor: C.accent }, vehicleText: { color: C.text, fontWeight: '600', fontSize: 13 }, vehicleTextSelected: { color: '#FFFFFF' },
  footnote: { color: C.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6 },
});
