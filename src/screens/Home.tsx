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
import { Canvas, BackdropFilter, Fill, ColorMatrix, Blur } from '@shopify/react-native-skia';
import { useAppColors, AppColors } from '@/theme';

type Sheet = 'category' | 'custom' | 'address' | 'when' | null;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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

const LIQUID_MATRIX = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1.4, -0.1
];

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
const sanitizeAddress = (text: string) => text.replace(/\./g, '').trim() || 'my place';
let lastUsedAddress = 'my place';

function AnimatedTextLink({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const textContent = React.Children.toArray(children).join('');
  const prevText = useRef(textContent);

  useEffect(() => {
    if (prevText.current !== textContent) {
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      prevText.current = textContent;
    }
  }, [textContent]);

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
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardHeight = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, { toValue: e.endCoordinates.height, duration: e.duration || 250, useNativeDriver: false }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
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
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start(() => {
      setModalVisible(false);
      setSheet(null);
    });
  };

  const handleSelect = (action: () => void) => {
    action(); 
    closeSheet(); 
  };

  const formatAddress = (text: string) => {
    if (!text || text === 'my place') return 'my place';
    return text.split(',')[0].trim();
  };

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
          <AnimatedTextLink style={[styles.blank, { color: activeCategoryColor }, !category && styles.blankEmpty]} onPress={() => openSheet('category')}>
            {category ? category.toLowerCase() : 'something'}
          </AnimatedTextLink>{' '}
          at{' '}
          <AnimatedTextLink style={[styles.blank, { color: COLORS.Address }]} onPress={openAddressSheet}>
            {formatAddress(address)}
          </AnimatedTextLink>{' '}
          which needs to happen{' '}
          <AnimatedTextLink style={[styles.blank, { color: COLORS.Time }]} onPress={() => { setTimeStep('day'); openSheet('when'); }}>
            {when.toLowerCase()}
          </AnimatedTextLink>.
        </Text>

        {category && (
          <Pressable style={styles.ctaButton} onPress={handleFindHelper}>
            <Text style={styles.ctaText}>Find a Helper</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </Pressable>
        )}
      </View>

      <Modal transparent visible={modalVisible} animationType="none" onRequestClose={closeSheet}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={{ paddingBottom: keyboardHeight }}>
              
              {/* === INTERACTIVE SHADER BACKDROP FOR LIQUID GLASS SHEET === */}
              <View style={StyleSheet.absoluteFill}>
                <Canvas style={styles.glassCanvas}>
                  <BackdropFilter
                    clip={{ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, rx: 32, ry: 32 }}
                    filter={<Blur blur={20} />}
                  >
                    {/* Micro-tint layer for premium transparency */}
                    <Fill color="rgba(255, 255, 255, 0.07)" />

                    <ColorMatrix matrix={LIQUID_MATRIX} />
                  </BackdropFilter>
                </Canvas>
              </View>

              <View style={styles.glassBorder} pointerEvents="none" />

              <View style={styles.sheetHeader}>
                <View style={styles.handle} />
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} keyboardShouldPersistTaps="handled">
                {sheet === 'category' && (
                  <>
                    <Text style={styles.sheetTitle}>What do you need help with?</Text>
                    {CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat.name}
                        style={styles.itemRow}
                        onPress={() => handleSelect(() => {
                          setCategory(cat.name);
                          setIsCustom(false);
                        })}
                      >
                        <View style={[styles.iconDot, { backgroundColor: COLORS[cat.name as keyof typeof COLORS] }]} />
                        <View>
                          <Text style={styles.itemLabel}>{cat.name}</Text>
                          <Text style={styles.itemSublabel}>{cat.example}</Text>
                        </View>
                      </Pressable>
                    ))}
                    <Pressable style={styles.itemRow} onPress={() => setSheet('custom')}>
                      <View style={[styles.iconDot, { backgroundColor: COLORS.Custom }]} />
                      <View>
                        <Text style={styles.itemLabel}>Something else</Text>
                        <Text style={styles.itemSublabel}>Type a custom task description</Text>
                      </View>
                    </Pressable>
                  </>
                )}

                {sheet === 'custom' && (
                  <>
                    <Text style={styles.sheetTitle}>Custom Task</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="E.g., Assemble Ikea bookshelf"
                      placeholderTextColor="#A1A1AA"
                      autoFocus
                      value={customText}
                      onChangeText={setCustomText}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (customText.trim()) {
                          handleSelect(() => {
                            setCategory(customText.trim());
                            setIsCustom(true);
                          });
                        }
                      }}
                    />
                  </>
                )}

                {sheet === 'address' && (
                  <>
                    <Text style={styles.sheetTitle}>Where should they go?</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Search street address..."
                      placeholderTextColor="#A1A1AA"
                      value={addressQuery}
                      onChangeText={handleAddressType}
                      autoFocus
                      returnKeyType="done"
                    />
                    <View style={styles.suggestionsList}>
                      {addressSuggestions.map((item, index) => (
                        <Pressable
                          key={index}
                          style={styles.suggestionRow}
                          onPress={() => handleSelect(() => setAddress(sanitizeAddress(item)))}
                        >
                          <MaterialCommunityIcons name="map-marker-outline" size={18} color="#71717A" style={{ marginRight: 8 }} />
                          <Text style={styles.suggestionText} numberOfLines={1}>{item}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {sheet === 'when' && (
                  <>
                    <Text style={styles.sheetTitle}>When do you need it?</Text>
                    {timeStep === 'day' ? (
                      <View style={styles.buttonGroup}>
                        {['Today', 'Tomorrow'].map((day) => (
                          <Pressable
                            key={day}
                            style={styles.stepButton}
                            onPress={() => {
                              setSelectedDay(day);
                              setTimeStep('time');
                            }}
                          >
                            <Text style={styles.stepButtonText}>{day}</Text>
                          </Pressable>
                        ))}
                        <Pressable style={[styles.stepButton, styles.asapButton]} onPress={() => handleSelect(() => setWhen('As soon as possible'))}>
                          <Text style={[styles.stepButtonText, { color: '#fff' }]}>As soon as possible</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.timePickerContainer}>
                        <DateTimePicker
                          value={selectedDate}
                          mode="time"
                          display="spinner"
                          onChange={(e: DateTimePickerEvent, date?: Date) => date && setSelectedDate(date)}
                          textColor={C.text}
                        />
                        <View style={styles.pickerActions}>
                          <Pressable style={styles.backButton} onPress={() => setTimeStep('day')}>
                            <Text style={styles.backButtonText}>Back</Text>
                          </Pressable>
                          <Pressable style={styles.confirmButton} onPress={confirmTime}>
                            <Text style={styles.confirmButtonText}>Confirm Time</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
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
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    alignSelf: 'flex-start',
  },
  pinOContainer: {
    position: 'relative',
    width: 38,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  speedLinesContainer: {
    position: 'absolute',
    top: -6,
    left: -12,
    gap: 2,
    zIndex: 10,
  },
  speedLineLong: {
    width: 13,
    height: 2.5,
    backgroundColor: '#2563EB',
    borderRadius: 1.25,
  },
  speedLineShort: {
    width: 8,
    height: 2.5,
    backgroundColor: '#2563EB',
    borderRadius: 1.25,
    marginLeft: 3,
  },
  pinIcon: {
    transform: [{ scaleX: 1.35 }, { scaleY: 1.1 }],
  },
  pinHole: {
    position: 'absolute',
    top: 5.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.bg,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2563EB',
    marginLeft: 2,
    letterSpacing: -1,
  },
  sentence: {
    fontSize: 32,
    fontWeight: '700',
    color: C.text,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  blank: {
    textDecorationLine: 'underline',
    fontWeight: '800',
  },
  blankEmpty: {
    textDecorationStyle: 'dashed',
  },
  ctaButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  glassCanvas: {
    ...StyleSheet.absoluteFill,
  },
  glassBorder: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 14,
    zIndex: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 16,
  },
  itemLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  itemSublabel: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 16,
    borderRadius: 14,
    fontSize: 17,
    color: '#1C1C1E',
  },
  suggestionsList: {
    maxHeight: 200,
    marginTop: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  suggestionText: {
    fontSize: 16,
    color: '#27272A',
    flex: 1,
  },
  buttonGroup: {
    gap: 12,
  },
  stepButton: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  asapButton: {
    backgroundColor: '#2563EB',
  },
  stepButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  timePickerContainer: {
    alignItems: 'center',
  },
  pickerActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717A',
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});