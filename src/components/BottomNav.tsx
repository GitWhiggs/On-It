import { useEffect, useRef, type ComponentProps } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// One tab in the bar. activeIcon is the icon shown while that tab is selected (optional).
export type NavTab = { label: string; icon: IconName; activeIcon?: IconName };

type Props = {
  index: number;
  onChange: (i: number) => void;
  dots?: boolean[];
  // Which tabs to show. Leave it out for the customer tabs (Home, Jobs, Account).
  tabs?: NavTab[];
};

const CUSTOMER_TABS: NavTab[] = [
  { label: 'Home', icon: 'lightning-bolt' },
  { label: 'Jobs', icon: 'clipboard-text-clock' },
  { label: 'Account', icon: 'account-outline', activeIcon: 'account' },
];

const NAV_WIDTH = Dimensions.get('window').width - 24;
const SIDE_PADDING = 7;
const TAB_GAP = 4;

export default function BottomNav({ index, onChange, tabs = CUSTOMER_TABS }: Props) {
  const insets = useSafeAreaInsets();
  // Works for any number of tabs (three for customers, four for helpers).
  const tabWidth = (NAV_WIDTH - SIDE_PADDING * 2 - TAB_GAP * (tabs.length - 1)) / tabs.length;
  const tabStep = tabWidth + TAB_GAP;
  const indicatorX = useRef(new Animated.Value(index * tabStep)).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: index * tabStep,
      stiffness: 260,
      damping: 24,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [index, indicatorX, tabStep]);

  return (
    <View
      style={[styles.wrap, { bottom: Math.max(insets.bottom - 10, 8) }]}
      pointerEvents="box-none"
    >
      <View style={styles.glassShell}>
        <View pointerEvents="none" style={styles.shellGlassRim} />
        {/* The selected glass lens glides between tabs. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slidingGlass,
            { width: tabWidth, transform: [{ translateX: indicatorX }] },
          ]}
        >
          <View pointerEvents="none" style={styles.buttonGlassRim} />
          <View pointerEvents="none" style={styles.buttonGlassHighlight} />
        </Animated.View>

        <View style={styles.tabs}>
          {tabs.map((tab, i) => {
            const active = index === i;

            return (
              <Pressable
                key={tab.label}
                style={styles.tab}
                onPress={() => {
                  if (index !== i) {
                    Haptics.selectionAsync();
                    onChange(i);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
              >
                <View style={styles.tabContent}>
                  <View style={styles.iconWrap}>
                    <MaterialCommunityIcons
                      name={active && tab.activeIcon ? tab.activeIcon : tab.icon}
                      size={active ? 24 : 23}
                      color={active ? '#111111' : '#686868'}
                    />
                  </View>
                  <Text style={[styles.label, active && styles.activeLabel]}>
                    {tab.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  glassShell: {
    width: NAV_WIDTH,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.25,
    borderColor: 'rgba(132, 140, 150, 0.38)',
    shadowColor: '#555A60',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.14,
    shadowRadius: 19,
    elevation: 10,
  },
  shellGlassRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: 'rgba(150, 158, 168, 0.10)',
  },
  slidingGlass: {
    position: 'absolute',
    left: 7,
    top: 4,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.68)',
    shadowColor: '#626B75',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius: 11,
    elevation: 5,
  },
  buttonGlassRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
  },
  buttonGlassHighlight: {
    position: 'absolute',
    top: 2,
    left: 12,
    right: 12,
    height: 17,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
  },
  tabContent: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#777777',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  activeLabel: {
    color: '#171717',
    fontWeight: '700',
  },
});