import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY_EMAIL = 'biometric_email';
const KEY_PASSWORD = 'biometric_password';
const KEY_ENABLED = 'biometric_enabled';

/** True when the device has biometric hardware and at least one enrolled fingerprint/face. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  return LocalAuthentication.isEnrolledAsync();
}

/** Returns a user-friendly label like "Face ID", "Touch ID", "Fingerprint", etc. */
export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  return 'Biometric';
}

/** Whether the user has opted-in to biometric login (credentials stored). */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(KEY_ENABLED);
    return val === 'true';
  } catch {
    return false;
  }
}

/** Store credentials and mark biometric login as enabled. */
export async function enableBiometric(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_EMAIL, email);
  await SecureStore.setItemAsync(KEY_PASSWORD, password);
  await SecureStore.setItemAsync(KEY_ENABLED, 'true');
}

/** Remove stored credentials and disable biometric login. */
export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_EMAIL);
  await SecureStore.deleteItemAsync(KEY_PASSWORD);
  await SecureStore.deleteItemAsync(KEY_ENABLED);
}

/**
 * Prompt biometric auth, then return stored credentials on success.
 * Returns `{ success: false }` if the user cancels or auth fails.
 */
export async function authenticateAndGetCredentials(): Promise<
  { success: true; email: string; password: string } | { success: false }
> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to BiteInsight',
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });

  if (!result.success) return { success: false };

  const email = await SecureStore.getItemAsync(KEY_EMAIL);
  const password = await SecureStore.getItemAsync(KEY_PASSWORD);

  if (!email || !password) return { success: false };
  return { success: true, email, password };
}
