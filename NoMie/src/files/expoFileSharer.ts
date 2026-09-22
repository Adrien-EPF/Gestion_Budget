import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { FileSharer, FileToSave, PickedFile } from './fileSharer';

/** Real OS boundary on native: writes to the cache directory, then the share sheet / document picker. */
export function createExpoFileSharer(): FileSharer {
  return {
    async share(file: FileToSave) {
      if (!FileSystem.cacheDirectory) throw new Error('Le dossier de cache de l’appareil est indisponible.');
      const uri = `${FileSystem.cacheDirectory}${file.filename}`;
      await FileSystem.writeAsStringAsync(uri, file.content, {
        encoding: file.base64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: file.mimeType });
      }
    },
    async pickFile(): Promise<PickedFile | null> {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return null;
      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return { name: asset.name, content };
    },
  };
}
