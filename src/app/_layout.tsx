import { Stack } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey="pk_test_51UWsN3CENrN8h7cQQJQZf12QxBIpTY8Jf8YjwvTazGOEP91e0T18aDYOTA4IjVnBpo892Iy7iD5qnCm01lMSW9N900HqKoaQr7"
      merchantIdentifier="merchant.com.whiggs.onit" // ✨ Add this so Apple Pay initializes correctly
    >
      <Stack screenOptions={{ headerShown: false }} />
    </StripeProvider>
  );
}