// An on/off switch in On-It's colors.
import { Platform, Switch } from 'react-native';
import { BLUE } from '@/theme';

type Props = {
  value: boolean;
  onValueChange: (on: boolean) => void;
  // What the switch controls, read out by screen readers.
  label: string;
  disabled?: boolean;
};

const OFF_TRACK = '#86847C';

// The web version of Switch takes the "on" thumb color under a different name.
const WEB_ONLY = Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : {};

export default function Toggle({ value, onValueChange, label, disabled = false }: Props) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ true: BLUE, false: OFF_TRACK }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={OFF_TRACK}
      accessibilityLabel={label}
      {...WEB_ONLY}
    />
  );
}
