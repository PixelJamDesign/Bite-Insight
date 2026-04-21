/**
 * useAvatarPicker — shared hook for the "Take photo / Choose from library"
 * alert used on both the dashboard and edit-profile.
 *
 * Returns a function that shows the picker. The caller decides what to do
 * with the picked file (e.g. set local state, or upload and persist).
 */
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

export function useAvatarPicker() {
  const { t: tp } = useTranslation('profile');
  const { t: tc } = useTranslation('common');

  return function pickAvatar(onPicked: (localUri: string) => void) {
    Alert.alert(
      tp('editProfile.avatar.alertTitle'),
      tp('editProfile.avatar.alertMessage'),
      [
        {
          text: tp('editProfile.avatar.takePhoto'),
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                tp('editProfile.avatar.permissionTitle'),
                tp('editProfile.avatar.permissionMessage'),
              );
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) onPicked(result.assets[0].uri);
          },
        },
        {
          text: tp('editProfile.avatar.chooseFromLibrary'),
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) onPicked(result.assets[0].uri);
          },
        },
        { text: tc('buttons.cancel'), style: 'cancel' },
      ],
    );
  };
}
