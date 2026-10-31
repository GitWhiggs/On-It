import { useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Sheet = 'category' | 'address' | 'when' | null;

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  border: '#DAD8D1',
  text: '#111111',
  textSecondary: '#5E5E5A',
  textMuted: '#9A9A94',
  accent: '#0F7B5F',
};

const CATEGORIES = [
  { name: 'Moving', example: 'Couches, dorms, truck unloads' },
  { name: 'Yard work', example: 'Raking, mowing, hauling branches' },
  { name: 'Events', example: 'Setup, cleanup, running errands' },
  { name: 'Errands', example: 'Groceries, pickups, returns' },
  { name: 'Seasonal', example: 'Snow shoveling, holiday lights' },
];

const TIMES = ['now', 'today', 'tomorrow', 'this weekend'];

export default function Home() {
  const [category, setCategory] = useState<string | null>(null);
  const [address, setAddress] = useState('Storrs, CT');
  const [when, setWhen] = useState('today');
  const [sheet, setSheet] = useState<Sheet>(null);

  const close = () => setSheet(null);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        <Text style={styles.logo}>On-It</Text>

        <Text style={styles.sentence}>
          I need help with{' '}
          <Text style={[styles.blank, !category && styles.blankEmpty]} onPress={() => setSheet('category')}>
            {category ? category.toLowerCase() : 'something'}
          </Text>{' '}
          at{' '}
          <Text style={styles.blank} onPress={() => setSheet('address')}>
            {address.trim() || 'your address'}
          </Text>{' '}
          <Text style={styles.blank} onPress={() => setSheet('when')}>
            {when}
          </Text>
          .
        </Text>

        <Pressable
          style={[styles.cta, !category && styles.ctaOff]}
          disabled={!category}
          onPress={() => {}}
        >
          <Text style={styles.ctaText}>Find a helper</Text>
        </Pressable>
      </View>

      <View style={styles.nav}>
      </View>

      <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={styles.sheet}>
            {sheet === 'category' && (
              <>
                <Text style={styles.sheetTitle}>What do you need help with?</Text>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.name}
                    style={styles.option}
                    onPress={() => { setCategory(c.name); close(); }}
                  >
                    <Text style={styles.optionName}>{c.name}</Text>
                    <Text style={styles.optionExample}>{c.example}</Text>
                  </Pressable>
                ))}
              </>
            )}

            {sheet === 'when' && (
              <>
                <Text style={styles.sheetTitle}>When?</Text>
                {TIMES.map((t) => (
                  <Pressable
                    key={t}
                    style={styles.option}
                    onPress={() => { setWhen(t); close(); }}
                  >
                    <Text style={styles.optionName}>{t}</Text>
                  </Pressable>
                ))}
              </>
            )}

            {sheet === 'address' && (
              <>
                <Text style={styles.sheetTitle}>Where should they go?</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street address"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={close}
                />
                <Pressable style={styles.cta} onPress={close}>
                  <Text style={styles.ctaText}>Done</Text>
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function NavItem({ icon, label, active }: { icon: IconName; label: string; active?: boolean }) {
  const color = active ? C.text : C.textMuted;
  return (
    <Pressable style={styles.navItem}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[styles.navLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: {
    flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120,
    justifyContent: 'space-between',
  },
  logo: { color: C.text, fontSize: 22, fontWeight: '800' },

  sentence: { color: C.text, fontSize: 42, fontWeight: '700', letterSpacing: -1.2, lineHeight: 52 },
  blank: {
    color: C.accent, textDecorationLine: 'underline', textDecorationColor: C.accent,
  },
  blankEmpty: { opacity: 0.55 },

  cta: {
    backgroundColor: C.text, borderRadius: 999, paddingVertical: 18, alignItems: 'center',
  },
  ctaOff: { backgroundColor: '#CFCDC6' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, gap: 4,
  },
  sheetTitle: { color: C.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  optionName: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  optionExample: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  input: {
    backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 16,
    padding: 16, fontSize: 18, color: C.text, marginBottom: 16,
  },

  nav: {
    position: 'absolute', left: 16, right: 16, bottom: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderColor: C.border, borderWidth: 1,
    borderRadius: 28, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 2 },
  navLabel: { fontSize: 11, fontWeight: '600' },
});