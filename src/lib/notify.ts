// Shows a plain pop-up message. React Native's Alert does nothing in the web version,
// so on web this uses the browser's own alert box instead.
import { Alert, Platform } from 'react-native';

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
