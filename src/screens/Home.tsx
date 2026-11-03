import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Animated, Dimensions, Keyboard, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Sheet = 'category' | 'custom' | 'address' | 'when' | null;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  border: '#DAD8D1',
  text: '#111111',
  textSecondary: '#5E5E5A',
  textMuted: '#9A9A94',
  accent: '#3B83F6', 
};

const COLORS = {
  Moving: '#EF4444',      
  'Yard work': '#15803D', 
  Events: '#A855F7',      
  Errands: '#10B981',     
  Seasonal: '#06B6D4',    
  Custom: '#F97316',      
  Address: '#2563EB',     
  Time: '#EC4899',        
  Placeholder: '#71717A', // ✨ A clean, neutral slate gray for "something"
};

const CATEGORIES = [
  { name: 'Moving', example: 'Couches, dorms, truck unloads' },
  { name: 'Yard work', example: 'Raking, mowing, hauling branches' },
  { name: 'Events', example: 'Setup, cleanup, running errands' },
  { name: 'Errands', example: 'Groceries, pickups, returns' },
  { name: 'Seasonal', example: 'Snow shoveling, holiday lights' },
];

const MOCK_ADDRESSES = [
  '123 Main St, Storrs, CT',
  '45 Eagleville Rd, Storrs, CT',
  '1 University Pl, Storrs, CT',
  '406 Farmington Ave, Hartford, CT',
  '800 Main St, Willimantic, CT',
];

function AnimatedTextLink({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const textContent = React.Children.toArray(children).join('');
  const prevText = useRef(textContent);

  useEffect(() => {
    if (prevText.current !== textContent) {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      prevText.current = textContent;
    }
  }, [textContent]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.timing(opacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.Text
      suppressHighlighting={true}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }], opacity }]}
    >
      {children}
    </Animated.Text>
  );
}

export default function Home() {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  
  const [address, setAddress] = useState('my place');
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
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false, 
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
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
      Animated.timing(slideAnim, { 
        toValue: SCREEN_HEIGHT, 
        duration: 250, 
        easing: Easing.out(Easing.cubic), 
        useNativeDriver: true 
      })
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
    const shortStreet = text.split(',')[0].trim();
    if (shortStreet.length > 25) {
      return shortStreet.substring(0, 22) + '...';
    }
    return shortStreet;
  };

  const handleAddressType = (text: string) => {
    setAddressQuery(text);
    setAddress(text); 
    if (text.length > 1) {
      const filtered = MOCK_ADDRESSES.filter(a => a.toLowerCase().includes(text.toLowerCase()));
      setAddressSuggestions(filtered.length === 0 ? [text] : filtered);
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
    hours = hours % 12;
    hours = hours ? hours : 12; 
    handleSelect(() => setWhen(`${selectedDay} at ${hours}:${minutes} ${ampm}`));
  };

  const activeCategoryColor = category 
    ? (isCustom 
        ? COLORS.Custom 
        : COLORS[category as keyof typeof COLORS] || C.accent)
    : COLORS.Placeholder; // ✨ Falls back to neutral gray when nothing is selected

  const handleFindHelper = () => {
    if (!category) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/create-job',
      params: {
        category: category,
        address: address,
        when: when,
      }
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        <Text style={styles.logo}>On-It</Text>

        <Text style={styles.sentence}>
          I need help with{' '}
          <AnimatedTextLink 
            style={[styles.blank, { color: activeCategoryColor }, !category && styles.blankEmpty]} 
            onPress={() => openSheet('category')}
          >
            {category ? category.toLowerCase() : 'something'}
          </AnimatedTextLink>{' '}
          at{' '}
          <AnimatedTextLink style={[styles.blank, { color: COLORS.Address }]} onPress={openAddressSheet}>
            {formatAddress(address)}
          </AnimatedTextLink>{' '}
          <AnimatedTextLink style={[styles.blank, { color: COLORS.Time }]} onPress={() => { setTimeStep('day'); openSheet('when'); }}>
            {when.toLowerCase()}
          </AnimatedTextLink>
        </Text>

        <Pressable
          style={[styles.cta, !category && styles.ctaOff]}
          disabled={!category}
          onPress={handleFindHelper}
        >
          <Text style={styles.ctaText}>Find a helper</Text>
        </Pressable>
      </View>

      <View style={styles.nav}></View>

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <View style={styles.modalRoot}>
          
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet()} />
          </Animated.View>

          <Animated.View 
            style={[styles.modalWrap, { paddingBottom: keyboardHeight }]} 
            pointerEvents="box-none"
          >
            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                
                {sheet === 'category' && (
                  <>
                    <Text style={styles.sheetTitle}>What do you need help with?</Text>
                    {CATEGORIES.map((c) => (
                      <Pressable
                        key={c.name}
                        style={styles.option}
                        onPress={() => handleSelect(() => { setCategory(c.name); setIsCustom(false); })}
                      >
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
                    <Pressable
                      style={[styles.cta, !customText.trim() && styles.ctaOff]}
                      disabled={!customText.trim()}
                      onPress={() => handleSelect(() => { setCategory(customText.trim()); setIsCustom(true); })}
                    >
                      <Text style={styles.ctaText}>Done</Text>
                    </Pressable>
                  </>
                )}

                {sheet === 'when' && timeStep === 'day' && (
                  <>
                    <Text style={styles.sheetTitle}>When do you need help?</Text>
                    <Pressable
                      style={styles.option}
                      onPress={() => handleSelect(() => setWhen('As soon as possible'))}
                    >
                      <Text style={styles.optionName}>As soon as possible</Text>
                    </Pressable>
                    <Pressable
                      style={styles.option}
                      onPress={() => { setSelectedDay('Today'); setTimeStep('time'); }}
                    >
                      <Text style={styles.optionName}>Today</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.option, styles.optionLast]}
                      onPress={() => { setSelectedDay('Tomorrow'); setTimeStep('time'); }}
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
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
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
                      <Text style={styles.ctaText}>Confirm Time</Text>
                    </Pressable>
                  </>
                )}

                {sheet === 'address' && (
                  <>
                    <Text style={styles.sheetTitle}>Where should they go?</Text>
                    <TextInput
                      style={[styles.input, addressSuggestions.length > 0 && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}
                      value={addressQuery}
                      onChangeText={handleAddressType}
                      placeholder="Search address..."
                      placeholderTextColor={C.textMuted}
                      returnKeyType="done"
                      onSubmitEditing={() => handleSelect(() => setAddress(addressQuery.trim() || 'my place'))}
                    />
                    
                    {addressSuggestions.length > 0 && (
                      <View style={styles.suggestionsBox}>
                        {addressSuggestions.map((suggestion, index) => (
                          <Pressable
                            key={suggestion}
                            style={[
                              styles.suggestionItem,
                              index === addressSuggestions.length - 1 && { borderBottomWidth: 0 }
                            ]}
                            onPress={() => {
                              setAddressQuery(suggestion);
                              setAddressSuggestions([]);
                              handleSelect(() => setAddress(suggestion));
                            }}
                          >
                            <MaterialCommunityIcons name="map-marker-outline" size={20} color={C.textSecondary} />
                            <Text style={styles.suggestionText} numberOfLines={1}>{suggestion}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    <Pressable style={[styles.cta, { marginTop: 16 }]} onPress={() => handleSelect(() => setAddress(addressQuery.trim() || 'my place'))}>
                      <Text style={styles.ctaText}>Done</Text>
                    </Pressable>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: {
    flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120,
    justifyContent: 'space-between',
  },
  logo: { color: C.text, fontSize: 22, fontWeight: '800' },

  sentence: { color: C.text, fontSize: 42, fontWeight: '700', letterSpacing: -1.2, lineHeight: 52 },
  blank: {
    fontWeight: '700',
  },
  blankEmpty: { opacity: 0.55 },

  cta: {
    backgroundColor: C.text, borderRadius: 999, paddingVertical: 18, alignItems: 'center',
  },
  ctaOff: { backgroundColor: '#CFCDC6' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  modalRoot: { flex: 1 },
  backdrop: { 
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)' 
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '85%', 
  },
  sheetTitle: { color: C.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  optionLast: { borderBottomWidth: 0 },
  
  optionName: { color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.2 }, 
  optionExample: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  
  input: {
    backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 16,
    padding: 16, fontSize: 18, color: C.text, marginBottom: 16,
    letterSpacing: 0, 
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
  suggestionText: {
    color: C.text,
    fontSize: 16,
    fontWeight: '500',
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