import {NativeModules} from 'react-native';

const {AppIntents} = NativeModules;

export async function captureAndRecognizeText(): Promise<string> {
  try {
    const result = await AppIntents.captureAndRecognizeText();
    return result;
  } catch (e) {
    return '';
  }
}
