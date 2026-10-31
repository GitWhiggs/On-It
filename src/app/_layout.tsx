import { Stack } from 'expo-router';

// Every file in this "app" folder is a screen. This file wraps them all.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}