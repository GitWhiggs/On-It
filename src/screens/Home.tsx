import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Animated, Dimensions, Keyboard, Easing, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAppColors, AppColors } from '@/theme';

type Sheet = 'category' | 'custom' | 'address' | 'when' | null;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  Moving: '#EF4444',      
  'Yard work': '#15803D', 
  Events: '#A855F7',      
  Errands: '#10B981',     
  Seasonal: '#06B6D4',    
  Custom: '#F97316',      
  Address: '#2563EB',     
  Time: '#EC4899',        
  Placeholder: '#71717A', 
};

const CATEGORIES = [
  { name: 'Moving', example: 'Furniture, boxes, truck loading' },
  { name: 'Yard work', example: 'Raking, mowing, brush cleanup' },
  { name: 'Events', example: 'Setup, teardown, party help' },
  { name: 'Errands', example: 'Curbside pickups, returns, donation runs' },
  { name: 'Seasonal', example: 'Snow shoveling, holiday lights' },
];

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
const sanitizeAddress = (text: string) => text.replace(/\./g, '').trim() || 'my place';

// Global memory cache for the last used address
let lastUsedAddress = 'my place';

function AnimatedTextLink({
  children,
  onPress,
  style,
  animateChange = true,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  animateChange?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const textContent = React.Children.toArray(children).join('');
  const prevText = useRef(textContent);

  useEffect(() => {
    if (prevText.current !== textContent) {
      if (animateChange) {
        opacity.setValue(0);
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      } else {
        opacity.setValue(1);
      }
      prevText.current = textContent;
    }
  }, [textContent, animateChange]);

  return (
    <Animated.Text
      suppressHighlighting={true}
      onPress={onPress}
      style={[style, { transform: [{ scale }], opacity }]}
    >
      {children}
    </Animated.Text>
  );
}


function GlassSheetButton({
  label,
  onPress,
  styles,
  marginTop = 0,
}: {
  label: string;
  onPress: () => void;
  styles: any;
  marginTop?: number;
}) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  return (
    <Animated.View
      style={[
        styles.sheetGlassCta,
        { marginTop },
        {
          transform: [
            { scale: pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
            { translateY: pressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) },
          ],
        },
      ]}
    >
      <Pressable
        style={styles.sheetGlassPressable}
        onPressIn={() => Animated.timing(pressAnim, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressAnim, { toValue: 0, speed: 11, bounciness: 2, useNativeDriver: true }).start()}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.ctaText}>{label}</Text>
      </Pressable>
      <View pointerEvents="none" style={styles.heroGlassRim} />
      <View pointerEvents="none" style={styles.heroGlassInnerRim} />
    </Animated.View>
  );
}

export default function Home() {
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  
  const [address, setAddress] = useState(lastUsedAddress);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);

  const [when, setWhen] = useState('As soon as possible');
  const [timeStep, setTimeStep] = useState<'day' | 'time'>('day'); 
  const [selectedDay, setSelectedDay] = useState('Today');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [sheet, setSheet] = useState<Sheet>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const ctaPress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      Animated.timing(keyboardHeight, { toValue: e.endCoordinates.height, duration: e.duration || 250, useNativeDriver: false }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setKeyboardVisible(false);
      Animated.timing(keyboardHeight, { toValue: 0, duration: e.duration || 250, useNativeDriver: false }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openSheet = (sheetType: Sheet) => {
    keyboardHeight.setValue(0); 
    setSheet(sheetType);
    setModalVisible(true);
    slideAnim.setValue(SCREEN_HEIGHT);
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true })
    ]).start();
  };

  const closeSheet = () => {
    Keyboard.dismiss(); 
    keyboardHeight.setValue(0); 

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start(() => {
      setModalVisible(false);
      setSheet(null);
    });
  };

  const handleSelect = (action: () => void) => {
    action(); 
    closeSheet(); 
  };

  // Keep only the street address (strips out town, state, zip for the sentence view)
  const formatAddress = (text: string) => {
    if (!text || text === 'my place') return 'my place';
    return text.split(',')[0].trim();
  };

  // Instant Mapbox address search query
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
          setAddressSuggestions(formattedSuggestions);
        }
      } catch (err) {
        console.error('Error fetching Mapbox autocomplete:', err);
      }
    } else {
      setAddressSuggestions([]);
    }
  };

  const openAddressSheet = () => {
    const current = address === 'my place' ? '' : address;
    setAddressQuery(current);
    setAddressSuggestions([]);
    openSheet('address');
  };

  const confirmTime = () => {
    let hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    handleSelect(() => setWhen(`${selectedDay} at ${hours}:${minutes} ${ampm}`));
  };

  const activeCategoryColor = category 
    ? (isCustom ? COLORS.Custom : COLORS[category as keyof typeof COLORS] || C.accent)
    : COLORS.Placeholder;

  const handleFindHelper = () => {
    if (!category) return;
    lastUsedAddress = address;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/create-job',
      params: { category, address, when }
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="auto" />

      <View style={styles.body}>
        {/* Custom Coded Brand Lockup with repositioned high wind lines & wider pin proportion */}
        <View style={styles.logoContainer}>
          <View style={styles.pinOContainer}>
            <View style={styles.speedLinesContainer}>
              <View style={styles.speedLineLong} />
              <View style={styles.speedLineShort} />
            </View>
            <MaterialCommunityIcons name="map-marker" size={32} color="#2563EB" style={styles.pinIcon} />
            <View style={styles.pinHole} />
          </View>
          <Text style={styles.logoText}>n-It</Text>
        </View>

        <Text style={styles.sentence}>
          I need help with{' '}
          <AnimatedTextLink
            style={[styles.blank, { color: activeCategoryColor }, !category && styles.blankEmpty]}
            onPress={() => openSheet('category')}
            animateChange={false}
          >
            {category ? category.toLowerCase() : 'something'}
          </AnimatedTextLink>{' '}
          at{' '}
          <AnimatedTextLink
            style={[styles.blank, { color: COLORS.Address }]}
            onPress={openAddressSheet}
            animateChange={false}
          >
            {formatAddress(address)}
          </AnimatedTextLink>{' '}
          <AnimatedTextLink style={[styles.blank, { color: COLORS.Time }]} onPress={() => { setTimeStep('day'); openSheet('when'); }}>
            {when.toLowerCase()}
          </AnimatedTextLink>
        </Text>

        <Animated.View
          style={[
            styles.cta,
            styles.heroGlassCta,
            !category && styles.ctaOff,
            !category && styles.heroGlassCtaOff,
            {
              transform: [
                { scale: ctaPress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
                { translateY: ctaPress.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) },
              ],
            },
          ]}
        >
          <Pressable
            style={styles.heroGlassPressable}
            disabled={!category}
            onPressIn={() => Animated.timing(ctaPress, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(ctaPress, { toValue: 0, speed: 11, bounciness: 2, useNativeDriver: true }).start()}
            onPress={handleFindHelper}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Find a helper</Text>
          </Pressable>
          {category && (
            <>
              <View pointerEvents="none" style={styles.heroGlassRim} />
              <View pointerEvents="none" style={styles.heroGlassInnerRim} />
            </>
          )}
        </Animated.View>
      </View>

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet()} />
          </Animated.View>

          {Platform.OS === 'ios' && sheet === 'address' && keyboardVisible && (
            <Animated.View
              pointerEvents="none"
              style={[styles.keyboardCornerFill, { height: keyboardHeight }]}
            />
          )}

          <Animated.View style={[styles.modalWrap, { paddingBottom: keyboardHeight }]} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.sheet,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                
                {sheet === 'category' && (
                  <>
                    <Text style={styles.sheetTitle}>What do you need help with?</Text>
                    {CATEGORIES.map((c) => (
                      <Pressable key={c.name} style={styles.option} onPress={() => handleSelect(() => { setCategory(c.name); setIsCustom(false); })}>
                        <Text style={styles.optionName}>{c.name}</Text>
                        <Text style={styles.optionExample}>{c.example}</Text>
                      </Pressable>
                    ))}
                    <Pressable style={[styles.option, styles.optionLast]} onPress={() => setSheet('custom')}>
                      <Text style={styles.optionName}>Something else</Text>
                    </Pressable>
                  </>
                )}

                {sheet === 'custom' && (
                  <>
                    <Text style={styles.sheetTitle}>What do you need help with?</Text>
                    <TextInput
                      style={styles.input}
                      value={customText}
                      onChangeText={setCustomText}
                      placeholder="e.g. assembling a desk"
                      placeholderTextColor={C.textMuted}
                      maxLength={40}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (!customText.trim()) return;
                        handleSelect(() => { setCategory(customText.trim()); setIsCustom(true); });
                      }}
                    />
                    <Pressable style={[styles.cta, !customText.trim() && styles.ctaOff]} disabled={!customText.trim()} onPress={() => handleSelect(() => { setCategory(customText.trim()); setIsCustom(true); })}>
                      <Text style={styles.ctaText}>Done</Text>
                    </Pressable>
                  </>
                )}

                {sheet === 'when' && timeStep === 'day' && (
                  <>
                    <Text style={styles.sheetTitle}>When do you need help?</Text>
                    <Pressable style={styles.option} onPress={() => handleSelect(() => setWhen('As soon as possible'))}>
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

                    <GlassSheetButton
                      label="Confirm Time"
                      onPress={confirmTime}
                      styles={styles}
                      marginTop={16}
                    />
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
                            const streetAddress = [addr.streetNumber, addr.street].filter(Boolean).join(' ').trim();
                            const locality = [addr.city, addr.region].filter(Boolean).join(', ');
                            const formatted = [streetAddress, locality].filter(Boolean).join(', ');
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
                      style={[styles.input, styles.addressSearchInput, addressSuggestions.length > 0 && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}
                      value={addressQuery}
                      onChangeText={handleAddressType}
                      placeholder="Search street address..."
                      placeholderTextColor={C.textMuted}
                      returnKeyType="done"
                      onSubmitEditing={() => handleSelect(() => setAddress(sanitizeAddress(addressQuery)))}
                    />
                    
                    {addressSuggestions.length > 0 && (
                      <View style={styles.suggestionsBox}>
                        {addressSuggestions.map((suggestion, index) => (
                          <Pressable
                            key={suggestion}
                            style={[styles.suggestionItem, index === addressSuggestions.length - 1 && { borderBottomWidth: 0 }]}
                            onPress={() => {
                              setAddressQuery(suggestion);
                              setAddressSuggestions([]);
                              handleSelect(() => setAddress(sanitizeAddress(suggestion)));
                            }}
                          >
                            <MaterialCommunityIcons name="map-marker-outline" size={20} color={C.textSecondary} />
                            <Text style={styles.suggestionText} numberOfLines={1}>{suggestion}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    <GlassSheetButton
                      label="Done"
                      onPress={() => handleSelect(() => setAddress(sanitizeAddress(addressQuery)))}
                      styles={styles}
                      marginTop={16}
                    />
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (C: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120, justifyContent: 'space-between' },
  
  // Custom Logo Styles matching the reference proportions & high wind lines
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  pinOContainer: { position: 'relative', width: 34, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  speedLinesContainer: { position: 'absolute', top: -4, left: -14, gap: 2, zIndex: 10 },
  speedLineLong: { width: 13, height: 2.5, backgroundColor: '#2563EB', borderRadius: 1.25 },
  speedLineShort: { width: 8, height: 2.5, backgroundColor: '#2563EB', borderRadius: 1.25, marginLeft: 3 },
  pinIcon: { transform: [{ scaleX: 1.35 }, { scaleY: 1.1 }] },
  pinHole: {
    position: 'absolute',
    top: 5.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.bg, // Matches background to form the hollow "O" center
  },
  logoText: { color: '#2563EB', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginLeft: 2 },

  sentence: { color: C.text, fontSize: 42, fontWeight: '700', letterSpacing: -1.2, lineHeight: 52 },
  blank: { fontWeight: '700' },
  blankEmpty: { opacity: 0.55 },
  cta: { backgroundColor: C.text, borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
  heroGlassCta: {
    position: 'relative',
    minHeight: 74,
    paddingVertical: 0,
    backgroundColor: 'rgba(5, 6, 8, 0.94)',
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(205, 214, 228, 0.30)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 13,
    elevation: 6,
  },
  heroGlassCtaOff: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  heroGlassPressable: {
    width: '100%',
    minHeight: 74,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 999,
  },
  heroGlassRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(224,231,242,0.12)',
    borderRightColor: 'rgba(224,231,242,0.10)',
    borderBottomColor: 'rgba(118,128,145,0.24)',
  },
  heroGlassInnerRim: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(220,228,240,0.06)',
  },


  sheetGlassCta: {
    position: 'relative',
    minHeight: 58,
    paddingVertical: 0,
    backgroundColor: 'rgba(5, 6, 8, 0.94)',
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(205, 214, 228, 0.30)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  sheetGlassPressable: {
    width: '100%',
    minHeight: 58,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
  },

  ctaOff: { backgroundColor: C.disabled },
  ctaText: { color: C.bg, fontSize: 17, fontWeight: '700' },
  modalRoot: { flex: 1 },
  keyboardCornerFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bg,
  },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  sheetTitle: { color: C.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  optionLast: { borderBottomWidth: 0 },
  optionName: { color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.2 }, 
  optionExample: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  input: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 18, color: C.text, marginBottom: 16 },
  addressSearchInput: { letterSpacing: -0.5 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  gpsBtnText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  pickerContainer: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', height: 180, justifyContent: 'center' },
  picker: { width: '100%', height: '100%' },
  suggestionsBox: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  suggestionText: { color: C.text, fontSize: 16, fontWeight: '500' },
});