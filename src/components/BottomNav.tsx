import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type SymbolName = SymbolViewProps['name'];
type FallbackIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const C = {
  text: '#111111',
  muted: '#6F6F6A',
  line: '#DAD8D1',
  accent: '#3B83F6',
};

// Apple SF Symbols, filled when selected. "fallback" is only used if SF Symbols aren't available (Android).
const TABS: { label: string; symbol: SymbolName; symbolOn: SymbolName; fallback: FallbackIcon }[] = [
  { label: 'Home', symbol: 'house', symbolOn: 'house.fill', fallback: 'home-outline' },
  { label: 'Jobs', symbol: 'list.clipboard', symbolOn: 'list.clipboard.fill', fallback: 'clipboard-list-outline' },
  { label: 'Account', symbol: 'person.crop.circle', symbolOn: 'person.crop.circle.fill', fallback: 'account-circle-outline' },
];

const PILL_PADDING = 6;
const hasGlass = isLiquidGlassAvailable();

export default function BottomNav({
  index,
  onChange,
  dots = [],
}: {
  index: number;
  onChange: (i: number) => void;
  dots?: number[];
}) {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const itemWidth = rowWidth / TABS.length;

  // Slide the highlight under the selected tab.
  useEffect(() => {
    if (!itemWidth) return;
    if (!placed.current) {
      x.setValue(index * itemWidth);
      placed.current = true;
      return;
    }
    Animated.spring(x, {
      toValue: index * itemWidth,
      stiffness: 420,
      damping: 38,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [index, itemWidth, x]);

  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom - 14, 10) }]}>
      <GlassView glassEffectStyle="regular" style={[styles.pill, !hasGlass && styles.pillFallback]}>
        <View style={styles.row} onLayout={onRowLayout}>
          {itemWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.lens, { width: itemWidth, transform: [{ translateX: x }] }]}
            />
          )}

          {TABS.map((tab, i) => {
            const active = i === index;
            const color = active ? C.text : C.muted;
            return (
              <Pressable
                key={tab.label}
                style={styles.item}
                onPress={() => {
                  if (!active) Haptics.selectionAsync();
                  onChange(i);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <View>
                  <SymbolView
                    name={active ? tab.symbolOn : tab.symbol}
                    size={24}
                    tintColor={color}
                    weight={active ? 'semibold' : 'regular'}
                    fallback={<MaterialCommunityIcons name={tab.fallback} size={24} color={color} />}
                  />
                  {dots.includes(i) && <View style={styles.dot} />}
                </View>
                <Text style={[styles.label, { color }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pill: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 36,
    padding: PILL_PADDING,
  },
  // Used when liquid glass isn't available (iOS before 26)
  pillFallback: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  row: { flexDirection: 'row' },
  lens: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(17,17,17,0.07)',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 9,
  },
  label: { fontSize: 11, fontWeight: '600' },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.accent,
  },
});