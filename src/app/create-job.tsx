import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TextInput, Pressable, KeyboardAvoidingView, Keyboard, Platform, ScrollView, LayoutAnimation, UIManager, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Sheet from '@/components/Sheet';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { getUid } from '@/lib/auth';

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
  { name: 'Moving', example: 'Furniture, boxes, truck loading' },
  { name: 'Yard work', example: 'Raking, mowing, brush cleanup' },
  { name: 'Events', example: 'Setup, teardown, party help' },
  { name: 'Errands', example: 'Curbside pickups, returns, donation runs' },
  { name: 'Seasonal', example: 'Snow shoveling, holiday lights' },
];

const OPTIONS: Record<string, string[]> = {
  Moving: ['Stairs', 'Heavy items', 'Elevator', 'Truck is ready', 'Fragile items', 'Needs assembly'],
  'Yard work': ['Tools provided', 'Bags provided', 'Large yard', 'Hilly yard', 'Dog on site', 'Side gate access'],
  Events: ['Setup', 'Cleanup', 'Heavy lifting', 'Indoors', 'Outdoors', 'Supplies provided'],
  Errands: ['Curbside pickup', 'Marketplace pickup', 'Package return', 'Donation drop-off', 'Bulky item', 'Car needed'],
  Seasonal: ['Snow shoveling', 'Holiday lights', 'Icy walkway', 'Salt provided', 'Large driveway', 'Ladder provided'],
};
const DEFAULT_OPTIONS = ['Stairs', 'Heavy items', 'Fragile items', 'Pet at home', 'Gate code', 'Tools provided'];

const SERVICE_FEE = 0.15; 
const MIN_PRICE = 1;
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

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
  const addDetailsPress = useRef(new Animated.Value(0)).current;
  const postJobPress = useRef(new Animated.Value(0)).current;
  const whereDonePress = useRef(new Animated.Value(0)).current;
  const goodToKnowDonePress = useRef(new Animated.Value(0)).current;

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

  // Instant Mapbox search handler
  const handleAddressType = async (text: string) => {
    setAddressQuery(text);
    if (text.length > 0) {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&country=us&types=address&limit=5`
        );
        const data = await response.json();
        
        if (data.features) {
          const formattedSuggestions = data.features.map((f: any) => f.place_name);
          setSuggestions(formattedSuggestions);
        }
      } catch (err) {
        console.error('Error fetching Mapbox autocomplete:', err);
      }
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

      const response = await fetch('https://acpwxtnxtxxskuqnrffc.supabase.co/functions/v1/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInCents }),
      }).catch(() => null);

      const data = response ? await response.json() : {};
      const clientSecret = data.clientSecret || 'seti_1_secret_test_mock';

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'OnIt',
        paymentIntentClientSecret: clientSecret,
        appearance: { colors: { primary: C.text }, shapes: { borderRadius: 16, borderWidth: 1 } },
      });

      if (initError) {
        Alert.alert('Payment Setup Error', initError.message);
        setLoading(false);
        return;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', paymentError.message);
        }
        setLoading(false);
      } else {
        const { error: dbError } = await supabase.from('jobs').insert([
          {
            user_id: getUid(),
            category,
            address,
            when_text: when,
            details: details.trim() || null,
            amount: total, 
            price: amount, 
            service_fee: fee,
            status: 'active',
          },
        ]);

        if (dbError) {
          console.error('Error saving job to database:', dbError.message);
          Alert.alert(
            'Payment went through, but your job wasn’t saved',
            'Please contact support so we can fix it. ' + dbError.message
          );
          setLoading(false);
          return;
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
        <Pressable style={styles.backBtn} onPress={() => { Haptics.selectionAsync(); router.back(); }}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Job details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={sheet === null} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss} accessible={false} style={styles.content}>
            
            <View style={styles.block}>
              {rows.map((r) => (
                <Pressable key={r.label} style={styles.row} onPress={() => { Haptics.selectionAsync(); r.onPress(); }}>
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
              <Animated.View
                style={[
                  styles.addDetailsGlass,
                  {
                    transform: [
                      { scale: addDetailsPress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
                      { translateY: addDetailsPress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
                    ],
                  },
                ]}
              >
                <Pressable
                  style={styles.addDetailsBtn}
                  onPressIn={() => Animated.timing(addDetailsPress, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
                  onPressOut={() => Animated.spring(addDetailsPress, { toValue: 0, speed: 11, bounciness: 2, useNativeDriver: true }).start()}
                  onPress={toggleDetails}
                >
                  <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.addDetailsText}>Add specific details</Text>
                </Pressable>
                <View pointerEvents="none" style={styles.blueGlassRim} />
                <View pointerEvents="none" style={styles.blueGlassHighlight} />
              </Animated.View>
            ) : (
              <View style={styles.section}>
                <View style={styles.detailsHeader}>
                  <Text style={styles.sectionTitle}>Specific details</Text>
                  <Pressable onPress={toggleDetails} hitSlop={10}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
                <Text style={styles.sectionSub}>Mention specific items, gate codes, or any special instructions.</Text>
                <TextInput
                  ref={detailsInputRef}
                  style={styles.textArea}
                  multiline
                  placeholder="e.g. Couch on the 2nd floor going to a truck. Parking is in the back..."
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
          <Animated.View
            style={[
              styles.postGlass,
              !canPost && styles.postGlassOff,
              {
                transform: [
                  { scale: postJobPress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
                  { translateY: postJobPress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
                ],
              },
            ]}
          >
            <Pressable
              style={styles.postGlassPressable}
              disabled={!canPost}
              onPressIn={() => canPost && Animated.timing(postJobPress, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(postJobPress, { toValue: 0, speed: 11, bounciness: 2, useNativeDriver: true }).start()}
              onPress={handlePost}
            >
              <Text style={styles.ctaText}>{loading ? 'Processing...' : canPost ? `Post job • ${money(total)}` : 'Post job'}</Text>
            </Pressable>
            {canPost && (
              <>
                <View pointerEvents="none" style={styles.blueGlassRim} />
                <View pointerEvents="none" style={styles.blueGlassHighlight} />
              </>
            )}
          </Animated.View>
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
            <Text style={[styles.sectionSub, { marginBottom: 16 }]}>Tap anything that applies to your {category ? category.toLowerCase() : 'job'}.</Text>
            <View style={styles.grid}>
              {options.map((o) => {
                const on = selected.includes(o);
                return (
                  <Pressable key={o} style={[styles.gridTile, on && styles.gridTileOn]} onPress={() => toggleOption(o)}>
                    <MaterialCommunityIcons name={on ? 'check-circle' : 'circle-outline'} size={18} color={on ? '#FFFFFF' : C.textMuted} />
                    <Text style={[styles.gridText, on && styles.gridTextOn]} numberOfLines={2}>{o}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Animated.View
              style={[
                styles.sheetBlueGlass,
                { marginTop: 24 },
                {
                  transform: [
                    { scale: goodToKnowDonePress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
                    { translateY: goodToKnowDonePress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
                  ],
                },
              ]}
            >
              <Pressable
                style={styles.sheetBlueGlassPressable}
                onPressIn={() => Animated.timing(goodToKnowDonePress, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(goodToKnowDonePress, { toValue: 0, speed: 11, bounciness: 2, useNativeDriver: true }).start()}
                onPress={closeSheet}
              >
                <Text style={styles.ctaText}>Done</Text>
              </Pressable>
              <View pointerEvents="none" style={styles.blueGlassRim} />
              <View pointerEvents="none" style={styles.blueGlassHighlight} />
            </Animated.View>
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
            <Pressable style={[styles.cta, !customText.trim() && styles.ctaOff]} disabled={!customText.trim()} onPress={saveCustom}>
              <Text style={styles.ctaText}>Done</Text>
            </Pressable>
          </>
        )}

        {sheet === 'address' && (
          <>
            <Text style={styles.sheetTitle}>Where should they go?</Text>
            
            <Pressable
              style={styles.gpsBtn}
              onPress={async () => {
                Haptics.selectionAsync();
                try {
                  let { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission denied', 'Allow location access to auto-fill your address.');
                    return;
                  }

                  let location = await Location.getCurrentPositionAsync({});
                  let addressResponse = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  });

                  if (addressResponse.length > 0) {
                    const addr = addressResponse[0];
                    const formatted = [addr.streetNumber, addr.street, addr.city, addr.region].filter(Boolean).join(' ');
                    setAddress(sanitizeAddress(formatted));
                    closeSheet();
                  }
                } catch (err) {
                  console.error(err);
                  Alert.alert('Error', 'Could not fetch your current location.');
                }
              }}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={C.accent} />
              <Text style={styles.gpsBtnText}>Use current location</Text>
            </Pressable>

            <TextInput
              style={[styles.sheetInput, suggestions.length > 0 && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}
              value={addressQuery}
              onChangeText={handleAddressType}
              placeholder="Search street address..."
              placeholderTextColor={C.textMuted}
              returnKeyType="done"
              onSubmitEditing={() => pick(() => setAddress(sanitizeAddress(addressQuery)))}
            />

            {suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {suggestions.map((s, i) => (
                  <Pressable key={s} style={[styles.suggestionItem, i === suggestions.length - 1 && { borderBottomWidth: 0 }]} onPress={() => pick(() => setAddress(sanitizeAddress(s)))}>
                    <MaterialCommunityIcons name="map-marker-outline" size={20} color={C.textSecondary} />
                    <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Animated.View
              style={[
                styles.sheetBlueGlass,
                { marginTop: 16 },
                {
                  transform: [
                    { scale: whereDonePress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
                    { translateY: whereDonePress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
                  ],
                },
              ]}
            >
              <Pressable
                style={styles.sheetBlueGlassPressable}
                onPressIn={() => Animated.timing(whereDonePress, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(whereDonePress, { toValue: 0, speed: 11, bounciness: 2, useNativeDriver: true }).start()}
                onPress={() => pick(() => setAddress(sanitizeAddress(addressQuery)))}
              >
                <Text style={styles.ctaText}>Done</Text>
              </Pressable>
              <View pointerEvents="none" style={styles.blueGlassRim} />
              <View pointerEvents="none" style={styles.blueGlassHighlight} />
            </Animated.View>
          </>
        )}

        {sheet === 'when' && timeStep === 'day' && (
          <>
            <Text style={styles.sheetTitle}>When do you need help?</Text>
            <Pressable style={styles.option} onPress={() => pick(() => setWhen('As soon as possible'))}>
              <Text style={styles.optionName}>As soon as possible</Text>
            </Pressable>
            <Pressable style={styles.option} onPress={() => { setSelectedDay('Today'); setTimeStep('time'); }}>
              <Text style={styles.optionName}>Today</Text>
            </Pressable>
            <Pressable style={[styles.option, styles.optionLast]} onPress={() => { setSelectedDay('Tomorrow'); setTimeStep('time'); }}>
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
                  if (date) { setSelectedDate(date); Haptics.selectionAsync(); }
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.surface },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.tile, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  headerSpacer: { width: 36 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 24 },
  block: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowLabel: { color: C.textSecondary, fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, marginLeft: 16 },
  rowValue: { color: C.text, fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  totalLabel: { color: C.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: C.text, fontSize: 17, fontWeight: '800' },
  section: { gap: 6 },
  sectionTitle: { color: C.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sectionSub: { color: C.textSecondary, fontSize: 14, lineHeight: 20 },
  addDetailsGlass: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginTop: -8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: C.accent,
    shadowColor: '#1D5FCB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 9,
    elevation: 3,
  },
  addDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  addDetailsText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  removeText: { color: C.textMuted, fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridTile: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.tile, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12 },
  gridTileOn: { backgroundColor: C.text },
  gridText: { flex: 1, color: C.text, fontSize: 14, fontWeight: '600' },
  gridTextOn: { color: '#FFFFFF' },
  textArea: { backgroundColor: C.tile, borderRadius: 16, padding: 16, fontSize: 16, lineHeight: 22, color: C.text, minHeight: 100 },
  priceBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.tile, borderRadius: 14, paddingHorizontal: 14, height: 48, gap: 4 },
  priceSign: { color: C.textSecondary, fontSize: 18, fontWeight: '700' },
  priceInput: { flex: 1, color: C.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3, paddingVertical: 0, includeFontPadding: false, height: 28 },
  bottomBar: { backgroundColor: C.surface, paddingHorizontal: 24, paddingTop: 12 },
  postGlass: {
    position: 'relative',
    minHeight: 54,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: C.accent,
    shadowColor: '#1D5FCB',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 11,
    elevation: 4,
  },
  postGlassOff: {
    backgroundColor: 'rgba(59, 131, 246, 0.30)',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  postGlassPressable: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 999,
  },
  blueGlassRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderLeftColor: 'rgba(255,255,255,0.13)',
    borderRightColor: 'rgba(255,255,255,0.10)',
    borderBottomColor: 'rgba(20,75,165,0.20)',
  },
  blueGlassHighlight: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sheetBlueGlass: {
    position: 'relative',
    minHeight: 54,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: C.accent,
    shadowColor: '#1D5FCB',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 11,
    elevation: 4,
  },
  sheetBlueGlassPressable: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 999,
  },
  cta: { backgroundColor: C.accent, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  ctaOff: { backgroundColor: 'rgba(59, 131, 246, 0.3)' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sheetTitle: { color: C.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  optionLast: { borderBottomWidth: 0 },
  optionName: { color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.2 },
  optionExample: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  sheetInput: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 18, color: C.text, marginBottom: 16 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  gpsBtnText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  pickerContainer: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', height: 180, justifyContent: 'center' },
  picker: { width: '100%', height: '100%' },
  suggestionsBox: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  suggestionText: { color: C.text, fontSize: 16, fontWeight: '500', flex: 1 },
});