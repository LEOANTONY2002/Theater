import {useEffect, useState} from 'react';
import {Keyboard, KeyboardEvent, Platform} from 'react-native';

/**
 * Returns a bottom inset in pixels that equals Android keyboard height + padding when visible, else 0.
 * On iOS it always returns 0 (let KeyboardAvoidingView handle it).
 */
export default function useAndroidKeyboardInset(padding: number = 10): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onShow = (e: KeyboardEvent) => {
      const height = e?.endCoordinates?.height ?? 0;
      setInset(height + padding);
    };
    const onHide = () => setInset(0);

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [padding]);

  return Platform.OS === 'android' ? inset : 0;
}
