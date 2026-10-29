// Login screen: phone number, then a 4-digit text code. No password.
// Texts aren't really sent yet. Any 4 digits work until we add a backend.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '@/components/Button';
import { BLUE, useTheme } from '@/theme';

// "5551234567" -> "(555) 123-4567"
function formatPhone(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function Login() {
  const t = useTheme();
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);

  const phoneReady = phone.replace(/\D/g, '').length === 10;
  const codeReady = code.length === 4;

  function sendCode() {
    // Later: ask the backend to text this number a code.
    setCode('');
    setStep('code');
  }

  function verify() {
    // Later: check the code with the backend, then open the home screen.
    setStep('done');
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={[styles.brand, { color: BLUE }]}>OnIt</Text>

        {step === 'phone' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: t.text }]}>What's your number?</Text>
            <Text style={[styles.sub, { color: t.muted }]}>
              We'll text you a code. No password needed.
            </Text>
            <View style={[styles.field, { backgroundColor: t.field, borderColor: focused ? BLUE : t.line }]}>
              <Text style={[styles.prefix, { color: t.text }]}>+1</Text>
              <TextInput
                style={[styles.input, { color: t.text }]}
                value={phone}
                onChangeText={(v) => setPhone(formatPhone(v))}
                placeholder="(555) 123-4567"
                placeholderTextColor={t.muted}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                accessibilityLabel="Phone number"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
              />
            </View>
            <Button label="Send code" onPress={sendCode} disabled={!phoneReady} />
          </View>
        )}

        {step === 'code' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: t.text }]}>Enter your code</Text>
            <Text style={[styles.sub, { color: t.muted }]}>Sent to +1 {phone}</Text>
            <View style={[styles.field, { backgroundColor: t.field, borderColor: focused ? BLUE : t.line }]}>
              <TextInput
                style={[styles.input, styles.code, { color: t.text }]}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                placeholderTextColor={t.muted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                accessibilityLabel="4-digit code"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
              />
            </View>
            <Button label="Verify" onPress={verify} disabled={!codeReady} />
            <Pressable onPress={() => setStep('phone')} accessibilityRole="button" style={styles.link}>
              <Text style={[styles.linkText, { color: BLUE }]}>Change number</Text>
            </Pressable>
          </View>
        )}

        {step === 'done' && (
          <View style={styles.form}>
            <Text style={[styles.title, { color: t.text }]}>You're in!</Text>
            <Text style={[styles.sub, { color: t.muted }]}>The home screen comes next.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brand: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginBottom: 32 },
  form: { gap: 12 },
  title: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 15, marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  prefix: { fontSize: 17, fontWeight: '700' },
  input: { flex: 1, fontSize: 17, fontWeight: '600', height: '100%', outlineWidth: 0 },
  code: { letterSpacing: 8 },
  link: { alignSelf: 'center', paddingVertical: 12 },
  linkText: { fontSize: 15, fontWeight: '600' },
});
