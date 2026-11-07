import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

// A bottom sheet that slides up over the page and lifts above the keyboard.
export default function Sheet({ visible, onClose, children }: Props) {
  const [mounted, setMounted] = useState(false);
  const slide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const keyboard = useRef(new Animated.Value(0)).current;

  // Keep showing the last content while the sheet slides away.
  const content = useRef<React.ReactNode>(children);
  if (visible) content.current = children;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboard, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboard, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboard]);

  useEffect(() => {
    if (visible) {
      keyboard.setValue(0);
      slide.setValue(SCREEN_HEIGHT);
      fade.setValue(0);
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Keyboard.dismiss();
      keyboard.setValue(0);
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(slide, {
          toValue: SCREEN_HEIGHT,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.wrap, { paddingBottom: keyboard }]} pointerEvents="box-none">
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {content.current}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FAFAF7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
});