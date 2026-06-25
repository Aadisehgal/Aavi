import {NativeModules} from 'react-native';

const {AppIntents} = NativeModules;

export async function generateQRCode(text: string, size: number = 512): Promise<string> {
  try {
    return await AppIntents.generateQRCode(text, size);
  } catch (e) {
    return '';
  }
}

export async function scanQRCode(): Promise<string> {
  try {
    return await AppIntents.scanQRCode();
  } catch (e) {
    return '';
  }
}
