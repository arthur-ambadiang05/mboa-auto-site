import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CatalogProvider } from '../lib/store';
export default function RootLayout() { return <CatalogProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></CatalogProvider>; }
