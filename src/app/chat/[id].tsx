import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, Image, Modal, Linking, Animated, Easing, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#FAFAF7',
  surfaceFlat: '#FFFFFF',
  inputFlat: '#F0EFE9',
  helperFlat: '#EEEDE8',
  userBlue: '#3B82F6',
  text: '#111111',
  textSecondary: '#6B6960',
  accent: '#FF5A1F',
};

const STEPS = ['Posted', 'Matched', 'On the way', 'Here', 'Done'];
const HEADLINES = [
  'Finding your helper.',
  'Marcus accepted your job.',
  'Marcus is on the way.',
  'Marcus is here.',
  'Marcus finished. All good?',
];

type SegState = 'done' | 'active' | 'todo';

function segmentState(i: number, step: number): SegState {
  if (step === STEPS.length - 1) return 'done';
  if (i < step) return 'done';
  if (i === step) return 'active';
  return 'todo';
}

function Segment({ state }: { state: SegState }) {
  const anim = useRef(new Animated.Value(state === 'done' ? 1 : 0)).current;

  useEffect(() => {
    if (state !== 'active') return undefined;

    anim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(250),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, anim]);

  return (
    <View style={styles.bar}>
      <Animated.View
        style={[
          styles.barFill,
          { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

interface Message {
  id: string;
  sender: 'user' | 'helper';
  text: string;
  image: string | null;
  time: string;
}

const QUICK_CHIPS = [
  "Thanks so much! 🙌",
  "Here's the spot 📍",
  "Appreciate your help!",
  "Ring doorbell when here",
  "Everything looks great"
];

export default function ChatRoom() {
  const router = useRouter();
  const { name } = useLocalSearchParams();
  const scrollViewRef = useRef<any>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      sender: 'helper', 
      text: 'On my way to Storrs now, see you in 10 minutes!', 
      image: null,
      time: '1:18 PM'
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);
  const [step, setStep] = useState(2);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        { 
          id: Date.now().toString(), 
          sender: 'user', 
          text: '', 
          image: result.assets[0].uri,
          time: currentTime
        }
      ]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const toggleDictation = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(!isRecording);
    if (!isRecording) {
      setInputText('Listening for voice input...');
    } else {
      setInputText("Thanks so much for the help!");
    }
  };

  const sendMessage = (textToSend?: string) => {
    const content = textToSend || inputText;
    if (!content.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'user', text: content, image: null, time: currentTime }
    ]);
    setInputText('');
    setIsRecording(false);
    Keyboard.dismiss();
    
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handlePhoneCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('tel:+18605550199');
  };

  const isTypingActive = inputText.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Flat Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }} 
          style={styles.actionBtnFlat}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={C.text} />
        </Pressable>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{name || 'Marcus V.'}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.liveDot} />
            <Text style={styles.headerSub}>Active Gig · Moving · $45</Text>
          </View>
        </View>

        <Pressable onPress={handlePhoneCall} style={styles.actionBtnFlat}>
          <MaterialCommunityIcons name="phone-outline" size={18} color={C.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[styles.chatScroll, { paddingBottom: isKeyboardVisible ? 20 : 50 }]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Flat Pinned Progress Widget */}
          <Pressable style={styles.live} onPress={() => setStep((s) => (s + 1) % STEPS.length)}>
            <View style={styles.liveTopRow}>
              <Text style={styles.headline}>{HEADLINES[step]}</Text>
              <View style={styles.gigPriceBadge}>
                <Text style={styles.gigPriceText}>$45</Text>
              </View>
            </View>

            <View style={styles.bars}>
              {STEPS.map((name, i) => (
                <Segment key={`${name}-${segmentState(i, step)}`} state={segmentState(i, step)} />
              ))}
            </View>
            
            <Text style={styles.stepText}>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </Text>
          </Pressable>

          {messages.map((m) => {
            const isUser = m.sender === 'user';

            return (
              <View key={m.id} style={[styles.bubbleRow, isUser ? styles.rowRight : styles.rowLeft]}>
                {m.image ? (
                  <Pressable 
                    onPress={() => {
                      Haptics.selectionAsync();
                      setFullscreenImageUri(m.image);
                    }}
                    style={styles.imageOnlyContainer}
                  >
                    <Image source={{ uri: m.image }} style={styles.attachedImage} />
                    
                    <View style={styles.timestampBlob}>
                      <Text style={styles.blobTimestampText}>
                        {m.time} ✓
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleHelper]}>
                    <Text style={[styles.bubbleText, isUser ? styles.textUser : styles.textHelper]}>
                      {m.text}
                    </Text>
                    <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampHelper]}>
                      {m.time} {isUser && '✓'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Full-Screen Image Preview Modal */}
        <Modal
          visible={fullscreenImageUri !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullscreenImageUri(null)}
        >
          <View style={styles.modalContainer}>
            <Pressable style={styles.modalCloseBtn} onPress={() => setFullscreenImageUri(null)}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </Pressable>
            {fullscreenImageUri && (
              <Image source={{ uri: fullscreenImageUri }} style={styles.fullscreenImage} resizeMode="contain" />
            )}
          </View>
        </Modal>

        {/* Flat Bottom Toolbar with Synchronized Flow Spacing */}
        <SafeAreaView edges={['bottom']} style={[styles.bottomToolbar, isKeyboardVisible && { paddingBottom: Platform.OS === 'ios' ? 4 : 0 }]}>
          {!isKeyboardVisible && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {QUICK_CHIPS.map((chipText) => (
                <Pressable 
                  key={chipText} 
                  onPress={() => sendMessage(chipText)}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{chipText}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputContainer}>
            <Pressable onPress={pickImage} style={styles.circularAttachBtn}>
              <MaterialCommunityIcons name="plus" size={18} color={C.text} />
            </Pressable>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={isRecording ? "Listening..." : "Message Marcus..."}
                placeholderTextColor="#8E8D87"
                value={inputText}
                onChangeText={setInputText}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Pressable 
                onPress={toggleDictation} 
                style={[styles.inlineDictateBtn, isRecording && styles.inlineDictateBtnActive]}
              >
                <MaterialCommunityIcons 
                  name={isRecording ? "waveform" : "microphone-outline"} 
                  size={16} 
                  color={isRecording ? "#fff" : C.textSecondary} 
                />
              </Pressable>
            </View>

            {isTypingActive && (
              <Pressable 
                style={({ pressed }) => [styles.sendBtn, pressed && { transform: [{ scale: 0.94 }] }]} 
                onPress={() => sendMessage()}
              >
                <MaterialCommunityIcons name="arrow-up" size={16} color="#fff" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.surfaceFlat,
  },
  actionBtnFlat: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: C.inputFlat,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22C55E' },
  headerSub: { fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', color: C.textSecondary, fontSize: 10.5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  live: { 
    backgroundColor: C.text, 
    borderRadius: 20, 
    padding: 16, 
    gap: 12, 
    marginBottom: 8,
  },
  liveTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headline: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.8, flex: 1, lineHeight: 26 },
  gigPriceBadge: { backgroundColor: C.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  gigPriceText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bars: { flexDirection: 'row', gap: 5 },
  bar: { flex: 1, height: 5, borderRadius: 2.5, backgroundColor: '#3A3A38', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.accent, borderRadius: 2.5 },
  stepText: { color: '#C9C7C0', fontSize: 12, fontWeight: '600' },

  chatScroll: { padding: 16, paddingTop: 16, gap: 12, flexGrow: 1 },

  bubbleRow: { flexDirection: 'row', width: '100%', marginVertical: 4, position: 'relative' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },

  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 2,
  },
  bubbleHelper: { 
    backgroundColor: C.helperFlat, 
    borderTopLeftRadius: 4, 
  },
  bubbleUser: { 
    backgroundColor: C.userBlue, 
    borderTopRightRadius: 4, 
  },

  imageOnlyContainer: {
    maxWidth: '78%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  attachedImage: {
    width: 200,
    height: 140,
    borderRadius: 14,
  },
  
  timestampBlob: {
    alignSelf: 'flex-end',
    marginTop: 4,
    backgroundColor: C.surfaceFlat,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  blobTimestampText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: C.textSecondary,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 54,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullscreenImage: { width: '100%', height: '80%' },

  bubbleText: { 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', 
    fontSize: 14.5, 
    lineHeight: 19, 
    fontWeight: '400' 
  },
  textHelper: { color: C.text },
  textUser: { color: '#fff' },

  timestamp: { fontSize: 9.5, fontWeight: '500', marginTop: 1 },
  timestampHelper: { color: '#8E8D87' },
  timestampUser: { color: 'rgba(255,255,255,0.8)', alignSelf: 'flex-end' },

  bottomToolbar: {
    backgroundColor: C.surfaceFlat,
    paddingTop: 6,
  },
  chipsScroll: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 8,
  },
  chip: {
    backgroundColor: C.inputFlat,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
    paddingTop: 4,
    gap: 8,
  },
  circularAttachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.inputFlat,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputFlat,
    borderRadius: 18,
    paddingRight: 6,
    paddingLeft: 4,
  },
  input: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14.5,
    color: C.text,
    letterSpacing: 0,
  },
  inlineDictateBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineDictateBtnActive: {
    backgroundColor: '#EF4444',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.userBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});