import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from 'expo-glass-effect';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type Props = {
  index: number;
  onChange: (i: number) => void;
  dots?: boolean[];
};

const TABS = [
  { label: 'Home', icon: 'magnify' },
  { label: 'Jobs', icon: 'clock-outline' },
  { label: 'Account', icon: 'account-outline' },
] as const;

export default function BottomNav({ index, onChange, dots = [] }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
      <GlassView 
        style={styles.pill} 
        glassEffectStyle="regular"
        tintColor="rgba(255, 255, 255, 0.65)"
      >
        {TABS.map((tab, i) => {
          const active = index === i;
          return (
            <Pressable
              key={tab.label}
              style={[styles.tab, active && styles.activeTab]}
              onPress={() => {
                if (index !== i) {
                  Haptics.selectionAsync();
                  onChange(i);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <View>
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={24}
                  color={active ? '#111111' : '#71717A'}
                />
                {dots[i] && <View style={styles.dot} />}
              </View>
            </Pressable>
          );
        })}
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    height: 64,
    width: '100%',
    borderRadius: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#FAFAF7',
  },
});