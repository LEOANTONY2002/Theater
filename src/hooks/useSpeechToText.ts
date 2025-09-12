import {useEffect, useState, useCallback} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
// Stable provider: unscoped react-native-voice-to-text (promise-only)
import * as VTT from 'react-native-voice-to-text';
const Provider: any = (VTT as any) ?? {};

type Status = 'idle' | 'recording' | 'denied';

export function useSpeechToText({
  locale = 'en-US',
  onFinal,
  onNoResult,
}: {
  locale?: string;
  onFinal?: (text: string) => void;
  onNoResult?: () => void;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [supported, setSupported] = useState<boolean>(true);
  const isRecording = status === 'recording';

  // Ask runtime permission on Android
  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
    if (!ok) setStatus('denied');
    return ok;
  }, []);

  // Initialize: basic capability check and set locale
  useEffect(() => {
    if (typeof Provider?.isRecognitionAvailable === 'function') {
      Provider.isRecognitionAvailable()
        .then((av: any) => setSupported(!!av))
        .catch(() => setSupported(false));
    } else {
      setSupported(true);
    }
    if (locale) {
      Provider?.setRecognitionLanguage?.(locale).catch(() => {});
    }
  }, [locale]);

  const start = useCallback(async () => {
    const ok = await requestPermission();
    if (!ok || !supported) return;
    try {
      // Ensure desired locale
      if (locale) {
        try {
          await Provider?.setRecognitionLanguage?.(locale);
        } catch (err) {
          // ignore
        }
      }
    
      // Promise-only provider path
      setStatus('recording');
      let delivered = false;
      try {
        const result: any = await Provider?.startSpeechToText?.({language: locale});
        const raw = typeof result === 'string' ? result : (result?.value ?? result?.text ?? '');
        const text = typeof raw === 'string' ? raw.trim() : '';
        if (text.length > 0 && onFinal) {
          onFinal(text);
          delivered = true;
        }
        if (text.length === 0 && !delivered) {
          onNoResult?.();
        }
      } catch (err) {
        // Treat errors as no-result for UX purposes
        if (!delivered) onNoResult?.();
      }
      setStatus('idle');
    } catch (e) {
      setStatus('idle');
    }
  }, [locale, requestPermission, supported]);

  const stop = useCallback(async () => {
    if (!isRecording) return;
    // No-op in promise-only mode
    setStatus('idle');
  }, [isRecording]);

  return {supported, status, isRecording, start, stop};
}
