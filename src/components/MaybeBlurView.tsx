import React from 'react';
import {Platform, View, ViewStyle, StyleProp, ViewProps} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import {BlurPreference} from '../store/blurPreference';
import {borderRadius, colors} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';

interface MaybeBlurViewProps {
  style?: StyleProp<ViewStyle>;
  blurType?: 'xlight' | 'light' | 'dark';
  blurAmount?: number;
  overlayColor?: string;
  gradientColors?: string[];
  pointerEvents?: ViewProps['pointerEvents'];
  modal?: boolean;
  radius?: number;
  bottomBar?: boolean;
  dialog?: boolean;
}

export const MaybeBlurView: React.FC<
  React.PropsWithChildren<MaybeBlurViewProps>
> = ({
  style,
  blurType = 'dark',
  blurAmount = 10,
  overlayColor,
  gradientColors,
  children,
  pointerEvents,
  modal = false,
  radius = borderRadius.round,
  bottomBar = false,
  dialog = false,
}) => {
  const [, setVersion] = React.useState(0);
  React.useEffect(() => {
    BlurPreference.init();
    const unsub = BlurPreference.subscribe(() => setVersion(v => v + 1));
    return unsub;
  }, []);
  const themeMode = BlurPreference.getMode();
  const useFallback = themeMode === 'normal';
  const {isTablet} = useResponsive();

  if (!useFallback) {
    return (
      <BlurView
        blurType={'light'}
        blurAmount={blurAmount}
        style={style}
        overlayColor={colors.modal.blurDark}
        pointerEvents={pointerEvents}>
        {children}
      </BlurView>
    );
  }

  // Fallback: light, GPU-friendly gradient + optional overlay color
  if (bottomBar) {
    return (
      <LinearGradient
        colors={['rgba(111, 111, 111, 0.42)', 'rgba(20, 20, 20, 0.5)']}
        start={{x: 0, y: 1}}
        end={{x: 1, y: 0}}
        style={style as any}
        pointerEvents={pointerEvents as any}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background.primary,
            borderWidth: 1.5,
            borderColor: 'rgba(0, 0, 0, 0.04)',
            borderRadius: radius,
          }}>
          {children}
        </View>
      </LinearGradient>
    );
  }

  if (dialog) {
    return (
      <LinearGradient
        colors={['rgba(111, 111, 111, 0.42)', 'rgba(20, 20, 20, 0.7)']}
        start={{x: 1, y: 0}}
        end={{x: 1, y: 1}}
        style={style as any}
        pointerEvents={pointerEvents as any}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(1, 0, 3, 0.8)',
            borderWidth: 1.5,
            borderColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: radius,
          }}>
          {children}
        </View>
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.5)']}
          style={{
            position: 'absolute',
            right: 0,
            height: isTablet ? '150%' : '100%',
            width: '180%',
            transform: [{rotate: isTablet ? '-10deg' : '-20deg'}],
            left: isTablet ? '-30%' : '-50%',
            bottom: isTablet ? '-20%' : '-30%',
            pointerEvents: 'none',
          }}
        />
      </LinearGradient>
    );
  }

  if (modal) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        start={{x: 0, y: 1}}
        end={{x: 0, y: 0}}
        style={[style, {overflow: 'hidden', position: 'relative'}]}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            borderTopWidth: 3,
            borderLeftWidth: 3,
            borderRightWidth: 3,
            borderColor: 'rgba(255, 254, 254, 0.04)',
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            zIndex: 1,
          }}>
          {children}
        </View>
        <LinearGradient
          colors={[
            'rgba(255, 254, 254, 0.09)',
            colors.background.primary,
            'black',
          ]}
          style={{
            position: 'absolute',
            right: 0,
            height: '150%',
            width: '200%',
            transform: [{rotate: '-25deg'}],
            left: '-30%',
            bottom: '-20%',
            pointerEvents: 'none',
          }}
        />
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: colors.background.primary,
          opacity: 0.8,
          elevation: 20,
          shadowColor: '#000000',
          shadowOffset: {width: 6, height: 10},
          shadowOpacity: 0.2,
          shadowRadius: 2,
        },
        style,
      ]}
      pointerEvents={pointerEvents}>
      {children}
    </View>
  );
};
