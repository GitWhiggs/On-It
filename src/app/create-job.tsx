import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Keyboard, Platform, ScrollView, LayoutAnimation, UIManager, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Sheet from '@/components/Sheet';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SheetName = 'category' | 'custom' | 'address' | 'when' | 'goodToKnow' | null;

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  tile: '#F0EFE9',
  line: '#E4E2DB',
  border: '#DAD8D1',
  text: '#111111',
  textSecondary: '#5E5E5A',
  textMuted: '#9A9A94',
  accent: '#3B83F6',
};

const CATEGORIES = [
  { name: 'Moving', example: 'Couches, dorms, truck unloads' },
  { name: 'Yard work', example: 'Raking, mowing, hauling branches' },
  { name: 'Events', example: 'Setup, cleanup, running errands' },
  { name: 'Errands', example: 'Groceries, pickups, returns' },
  { name: 'Seasonal', example: 'Snow shoveling, holiday lights' },
];

const OPTIONS: Record<string, string[]> = {
  Moving: ['Stairs', 'Heavy items', 'Elevator', 'Truck is ready', 'Parking nearby', 'Fragile items'],
  'Yard work': ['Tools provided', 'Bags provided', 'Large yard', 'Slope or hills', 'Dog on property', 'Gate code needed'],
  Events: ['Setup', 'Cleanup', 'Heavy lifting', 'Indoors', 'Outdoors', 'Parking nearby'],
  Errands: ['Groceries', 'Pickup', 'Return an item', 'Heavy bags', 'Wait in line', 'Need a receipt'],
  Seasonal: ['Snow shoveling', 'Holiday lights', 'Icy walkway', 'Salt provided', 'Large driveway', 'Ladder provided'],
};
const DEFAULT_OPTIONS = ['Stairs', 'Heavy items', 'Parking nearby', 'Pet at home', 'Gate code needed', 'Tools provided'];

const MOCK_ADDRESSES = [
  '123 Main St, Storrs, CT',
  '45 Eagleville Rd, Storrs, CT',
  '1 University Pl, Storrs, CT',
  '406 Farmington Ave, Hartford, CT',
  '800 Main St, Willimantic, CT',
];

const SERVICE_FEE = 0.15; 
const MIN_PRICE = 1;

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? '';
const money = (n: number) => `$${n.toFixed(2)}`;
const sanitizeAddress = (text: string) => text.replace(/\./g, '').trim() || 'my place';

function cleanPrice(text: string) {
  const [whole, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  const w = whole.slice(0, 5);
  return rest.length > 0 ? `${w}.${rest.join('').slice(0, 2)}` : w;
}

export default function CreateJob() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; address?: string; when?: string }>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const detailsInputRef = useRef<any>(null); 

  const [category, setCategory] = useState(first(params.category));
  const [address, setAddress] = useState(first(params.address) || 'my place');
  const [when, setWhen] = useState(first(params.when) || 'As soon as possible');
  
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState('');
  
  const [price, setPrice] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [sheet, setSheet] = useState<SheetName>(null);
  const [customText, setCustomText] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [timeStep, setTimeStep] = useState<'day' | 'time'>('day');
  const [selectedDay, setSelectedDay] = useState('Today');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const options = OPTIONS[category] ?? DEFAULT_OPTIONS;
  const picked = options.filter((o) => selected.includes(o));

  const toggleOption = (o: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  };

  const amount = parseFloat(price) || 0;
  const fee = Math.round(amount * SERVICE_FEE * 100) / 100;
  const total = amount + fee;
  const canPost = category.trim().length > 0 && amount >= MIN_PRICE && !loading;

  const closeSheet = () => setSheet(null);
  const pick = (action: () => void) => {
    action();
    closeSheet();
  };

  const openAddress = () => {
    setAddressQuery(address === 'my place' ? '' : address);
    setSuggestions([]);
    setSheet('address');
  };

  const openWhen = () => {
    setTimeStep('day');
    setSheet('when');
  };

  const handleAddressType = (text: string) => {
    setAddressQuery(text);
    if (text.length > 1) {
      const filtered = MOCK_ADDRESSES.filter((a) => a.toLowerCase().includes(text.toLowerCase()));
      setSuggestions(filtered.length === 0 ? [text] : filtered);
    } else {
      setSuggestions([]);
    }
  };

  const saveCustom = () => {
    const text = customText.trim();
    if (!text) return;
    pick(() => {
      setCategory(text);
      setCustomText('');
    });
  };

  const confirmTime = () => {
    let hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    pick(() => setWhen(`${selectedDay} at ${hours}:${minutes} ${ampm}`));
  };

  const handlePost = async () => {
    if (!canPost) return;
    setLoading(true);
    Haptics.selectionAsync();

    try {
      const amountInCents = Math.round(total * 100);

      // Fetch client secret from your deployed Supabase Edge Function with local fallback support
      const response = await fetch('https://acpwxtnxtxxskuqnrffc.supabase.co/functions/v1/create-payment-intent', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: amountInCents }),
      }).catch(() => null);

      const data = response ? await response.json() : {};
      const clientSecret = data.clientSecret || 'seti_1_secret_test_mock';

      // Initialize Stripe Payment Sheet with clean native appearance settings
      // Initialize Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'OnIt',
        paymentIntentClientSecret: clientSecret,
        appearance: {
          colors: { 
            primary: C.text,
          },
          shapes: {
            borderRadius: 16,
            borderWidth: 1,
          },
        },
      });

      if (initError) {
        Alert.alert('Payment Setup Error', initError.message);
        setLoading(false);
        return;
      }

      // Present Stripe Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', paymentError.message);
        }
        setLoading(false);
      } else {
        // Save job details to Supabase database upon successful payment
        const { error: dbError } = await supabase.from('jobs').insert([
          {
            category,
            address,
            when_text: when,
            details: details.trim() || null,
            amount: total,
            status: 'active',
          },
        ]);

        if (dbError) {
          console.error('Error saving job to database:', dbError.message);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLoading(false);
        router.dismissTo({ pathname: '/main', params: { tab: 'jobs', t: String(Date.now()) } });
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      Alert.alert('Error', 'Something went wrong processing your payment.');
    }
  };

  const toggleDetails = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!showDetails) {
      setShowDetails(true);
      setTimeout(() => detailsInputRef.current?.focus(), 100);
    } else {
      setShowDetails(false);
      Keyboard.dismiss();
    }
  };

  const summaryLabel = picked.length > 0 ? `${picked.length} selected` : 'None';
  const rows = [
    { label: 'Job', value: category || 'Choose a job', onPress: () => setSheet('category') },
    { label: 'Where', value: address, onPress: openAddress },
    { label: 'When', value: when, onPress: openWhen },
    { label: 'Good to know', value: summaryLabel, onPress: () => setSheet('goodToKnow') },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Job details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={sheet === null}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false} style={styles.content}>
            
            <View style={styles.block}>
              {rows.map((r) => (
                <Pressable
                  key={r.label}
                  style={styles.row}
                  onPress={() => {
                    Haptics.selectionAsync();
                    r.onPress();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.label}: ${r.value}. Tap to change.`}
                >
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, r.value === 'None' && { color: C.textMuted }]} numberOfLines={1}>
                      {r.value}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>

            {!showDetails ? (
              <Pressable 
                style={styles.addDetailsBtn} 
                onPress={toggleDetails}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color={C.accent} />
                <Text style={styles.addDetailsText}>Add specific details</Text>
              </Pressable>
            ) : (
              <View style={styles.section}>
                <View style={styles.detailsHeader}>
                  <Text style={styles.sectionTitle}>Specific details</Text>
                  <Pressable onPress={toggleDetails} hitSlop={10}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
                <Text style={styles.sectionSub}>
                  Mention specific items, gate codes, or any special instructions.
                </Text>
                <TextInput
                  ref={detailsInputRef}
                  style={styles.textArea}
                  multiline
                  placeholder="e.g. Need help moving a couch from the 2nd floor down to a truck. 2 people needed..."
                  placeholderTextColor={C.textMuted}
                  value={details}
                  onChangeText={setDetails}
                  textAlignVertical="top"
                />
              </View>
            )}

            <View style={[styles.section, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Payment</Text>
              <Text style={styles.sectionSub}>How much are you paying for this job?</Text>
            </View>

            {/* Clean compact price box */}
            <View style={styles.priceBox}>
              <Text style={styles.priceSign}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={(t) => setPrice(cleanPrice(t))}
                placeholder="0"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                maxLength={8}
                accessibilityLabel="Payment amount in dollars"
              />
            </View>

            {amount > 0 && (
              <View style={[styles.block, { marginTop: 12 }]}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Job price</Text>
                  <Text style={styles.rowValue}>{money(amount)}</Text>
                </View>
                
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Service fee ({Math.round(SERVICE_FEE * 100)}%)</Text>
                  <Text style={styles.rowValue}>{money(fee)}</Text>
                </View>
                
                <View style={styles.row}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{money(total)}</Text>
                </View>
              </View>
            )}
          </Pressable>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: keyboardOpen ? 12 : insets.bottom + 12 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              !canPost && styles.ctaOff,
              pressed && canPost && { transform: [{ scale: 0.97 }] },
            ]}
            disabled={!canPost}
            onPress={handlePost}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>
              {loading ? 'Processing...' : canPost ? `Post job • ${money(total)}` : 'Post job'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={sheet !== null} onClose={closeSheet}>
        {sheet === 'category' && (
          <>
            <Text style={styles.sheetTitle}>What do you need help with?</Text>
            {CATEGORIES.map((c) => (
              <Pressable key={c.name} style={styles.option} onPress={() => pick(() => setCategory(c.name))}>
                <Text style={styles.optionName}>{c.name}</Text>
                <Text style={styles.optionExample}>{c.example}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.option, styles.optionLast]} onPress={() => setSheet('custom')}>
              <Text style={styles.optionName}>Something else</Text>
            </Pressable>
          </>
        )}

        {sheet === 'goodToKnow' && (
          <>
            <Text style={styles.sheetTitle}>Good to know</Text>
            <Text style={[styles.sectionSub, { marginBottom: 16 }]}>
              Tap anything that applies to your {category ? category.toLowerCase() : 'job'}.
            </Text>
            <View style={styles.grid}>
              {options.map((o) => {
                const on = selected.includes(o);
                return (
                  <Pressable
                    key={o}
                    style={[styles.gridTile, on && styles.gridTileOn]}
                    onPress={() => toggleOption(o)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                  >
                    <MaterialCommunityIcons
                      name={on ? 'check-circle' : 'circle-outline'}
                      size={18}
                      color={on ? '#FFFFFF' : C.textMuted}
                    />
                    <Text style={[styles.gridText, on && styles.gridTextOn]} numberOfLines={1}>{o}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={[styles.cta, { marginTop: 24 }]} onPress={closeSheet}>
              <Text style={styles.ctaText}>Done</Text>
            </Pressable>
          </>
        )}

        {sheet === 'custom' && (
          <>
            <Text style={styles.sheetTitle}>What do you need help with?</Text>
            <TextInput
              style={styles.sheetInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="e.g. assembling a desk"
              placeholderTextColor={C.textMuted}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={saveCustom}
            />
            <Pressable
              style={[styles.cta, !customText.trim() && styles.ctaOff]}
              disabled={!customText.trim()}
              onPress={saveCustom}
            >
              <Text style={styles.ctaText}>Done</Text>
            </Pressable>
          </>
        )}

        {sheet === 'address' && (
          <>
            <Text style={styles.sheetTitle}>Where should they go?</Text>
            <TextInput
              style={[
                styles.sheetInput,
                suggestions.length > 0 && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
              ]}
              value={addressQuery}
              onChangeText={handleAddressType}
              placeholder="Search address..."
              placeholderTextColor={C.textMuted}
              returnKeyType="done"
              onSubmitEditing={() => pick(() => setAddress(sanitizeAddress(addressQuery)))}
            />

            {suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {suggestions.map((s, i) => (
                  <Pressable
                    key={s}
                    style={[styles.suggestionItem, i === suggestions.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => pick(() => setAddress(sanitizeAddress(s)))}
                  >
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color={C.textSecondary} />
                    <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable
              style={[styles.cta, { marginTop: 16 }]}
              onPress={() => pick(() => setAddress(sanitizeAddress(addressQuery)))}
            >
              <Text style={styles.ctaText}>Done</Text>
            </Pressable>
          </>
        )}

        {sheet === 'when' && timeStep === 'day' && (
          <>
            <Text style={styles.sheetTitle}>When do you need help?</Text>
            <Pressable style={styles.option} onPress={() => pick(() => setWhen('As soon as possible'))}>
              <Text style={styles.optionName}>As soon as possible</Text>
            </Pressable>
            <Pressable
              style={styles.option}
              onPress={() => {
                setSelectedDay('Today');
                setTimeStep('time');
              }}
            >
              <Text style={styles.optionName}>Today</Text>
            </Pressable>
            <Pressable
              style={[styles.option, styles.optionLast]}
              onPress={() => {
                setSelectedDay('Tomorrow');
                setTimeStep('time');
              }}
            >
              <Text style={styles.optionName}>Tomorrow</Text>
            </Pressable>
          </>
        )}

        {sheet === 'when' && timeStep === 'time' && (
          <>
            <Pressable onPress={() => setTimeStep('day')} style={{ marginBottom: 8 }}>
              <Text style={{ color: C.accent, fontWeight: '600' }}>← Back</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>What time {selectedDay.toLowerCase()}?</Text>

            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="spinner"
                minuteInterval={15}
                onChange={(_event: DateTimePickerEvent, date?: Date) => {
                  if (date) {
                    setSelectedDate(date);
                    Haptics.selectionAsync();
                  }
                }}
                style={styles.picker}
                textColor={C.text}
              />
            </View>

            <Pressable style={[styles.cta, { marginTop: 16 }]} onPress={confirmTime}>
              <Text style={styles.ctaText}>Confirm time</Text>
            </Pressable>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  headerSpacer: { width: 36 },

  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 24 },

  block: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  rowLabel: { color: C.textSecondary, fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, marginLeft: 16 },
  rowValue: { color: C.text, fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  totalLabel: { color: C.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: C.text, fontSize: 17, fontWeight: '800' },

  section: { gap: 6 },
  sectionTitle: { color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sectionSub: { color: C.textSecondary, fontSize: 14, lineHeight: 20 },

  addDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: -8,
  },
  addDetailsText: {
    color: C.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridTile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.tile,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  gridTileOn: { backgroundColor: C.text },
  gridText: { flex: 1, color: C.text, fontSize: 14, fontWeight: '600' },
  gridTextOn: { color: '#FFFFFF' },

  textArea: {
    backgroundColor: C.tile,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    color: C.text,
    minHeight: 100,
  },

  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.tile,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 4,
  },
  priceSign: { color: C.textSecondary, fontSize: 18, fontWeight: '700' },
  priceInput: {
    flex: 1,
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingVertical: 0, 
    includeFontPadding: false, 
    height: 28, 
  },

  bottomBar: {
    backgroundColor: C.surface,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  cta: {
    backgroundColor: C.accent,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaOff: { backgroundColor: 'rgba(59, 131, 246, 0.3)' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  sheetTitle: { color: C.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  optionLast: { borderBottomWidth: 0 },
  optionName: { color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.2 },
  optionExample: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  sheetInput: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    color: C.text,
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    height: 180,
    justifyContent: 'center',
  },
  picker: { width: '100%', height: '100%' },
  suggestionsBox: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionText: { color: C.text, fontSize: 16, fontWeight: '500', flex: 1 },
});