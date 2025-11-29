import React from 'react';
import {Platform, View, ViewStyle, StyleProp, ViewProps} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import {BlurPreference} from '../store/blurPreference';
import {borderRadius, colors, spacing} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';

interface MaybeBlurViewProps {
  style?: StyleProp<ViewStyle>;
  blurType?: 'xlight' | 'light' | 'dark';
  blurAmount?: number;
  overlayColor?: string;
  gradientColors?: string[];
  pointerEvents?: ViewProps['pointerEvents'];
  radius?: number;
  bottomBar?: boolean;
  dialog?: boolean;
  header?: boolean;
  body?: boolean;
  isAI?: boolean;
  isSingle?: boolean;
}

export const MaybeBlurView: React.FC<
  React.PropsWithChildren<MaybeBlurViewProps>
> = ({
  style,
  children,
  pointerEvents,
  radius = borderRadius.round,
  bottomBar = false,
  dialog = false,
  header = false,
  body = false,
  isAI = false,
  isSingle = false,
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

  if (header) {
    if (!useFallback && !isAI) {
      return (
        <View
          style={[
            style,
            {
              padding: spacing.md,
              backgroundColor: colors.modal.blur,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.border,
              borderRadius: radius,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: isTablet ? spacing.xl : spacing.md,
            },
          ]}>
          {children}
        </View>
      );
    } else if (isAI) {
      return (
        <View
          style={[
            style,
            {
              padding: spacing.md,
              backgroundColor: colors.modal.blur,
              borderWidth: 1.5,
              borderColor: 'rgba(187, 187, 187, 0.1)',
              borderRadius: radius,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: isTablet ? spacing.xl : spacing.md,
            },
          ]}>
          {children}
        </View>
      );
    } else {
      return (
        <LinearGradient
          colors={['rgba(111, 111, 111, 0.42)', 'rgba(20, 20, 20, 0.5)']}
          start={{x: 0, y: 1}}
          end={{x: 1, y: 0}}
          style={[
            style,
            {
              borderRadius: borderRadius.round,
              marginBottom: isTablet ? spacing.xl : spacing.md,
            },
          ]}
          pointerEvents={pointerEvents as any}>
          <View
            style={{
              padding: spacing.md,
              backgroundColor: colors.background.primary,
              borderWidth: 3,
              borderColor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: radius,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            {children}
          </View>
        </LinearGradient>
      );
    }
  }

  if (body) {
    if (!useFallback) {
      return (
        <View
          style={[
            style,
            {
              flex: 1,
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.border,
              backgroundColor: colors.modal.blur,
            },
          ]}>
          {children}
        </View>
      );
    } else {
      return (
        <LinearGradient
          colors={[colors.background.primary, colors.background.secondary]}
          start={{x: 0, y: 1}}
          end={{x: 0, y: 0}}
          style={[
            style,
            {
              overflow: 'hidden',
              position: 'relative',
              flex: 1,
              borderRadius: borderRadius.xl,
            },
          ]}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background.primary,
              borderTopWidth: 3,
              borderLeftWidth: 3,
              borderRightWidth: 3,
              borderColor: 'rgba(255, 254, 254, 0.04)',
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              zIndex: 10,
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
  }

  if (bottomBar) {
    if (!useFallback) {
      return (
        <View
          style={[
            style,
            {
              flex: 1,
              overflow: 'hidden',
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.content,
              borderRadius: borderRadius.round,
            },
          ]}>
          <BlurView
            blurType="light"
            blurAmount={5}
            downsampleFactor={100}

            overlayColor={'rgba(50, 50, 50, 0.35)'}
            style={{
              flex: 1,
            }}>
            {children}
          </BlurView>
        </View>
      );
    } else {
      return (
        <LinearGradient
          colors={['rgba(111, 111, 111, 0.3)', 'rgba(20, 20, 20, 0.5)']}
          start={{x: 0, y: 1}}
          end={{x: 1, y: 0}}
          style={[
            style,
            {
              flex: 1,
              borderRadius: borderRadius.round,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          pointerEvents={pointerEvents as any}>
          <View
            style={{
              backgroundColor: colors.background.primary,
              borderWidth: 1.5,
              borderColor: 'rgba(0, 0, 0, 0.04)',
              height: '100%',
              width: '100%',
              borderRadius: borderRadius.round,
              zIndex: 10,
            }}>
            {children}
          </View>
        </LinearGradient>
      );
    }
  }

  if (dialog) {
    if (!useFallback) {
      return (
        <View
          style={[
            style,
            {
              flex: 1,
              overflow: 'hidden',
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.border,
              borderRadius: radius || borderRadius.round,
            },
          ]}>
          <BlurView
            blurType="light"
            blurAmount={5}
            overlayColor={colors.modal.blur}
            downsampleFactor={10}
            style={{
              flex: 1,
            }}>
            {children}
          </BlurView>
        </View>
      );
    } else {
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
              backgroundColor: 'black',
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
  }

  if (isSingle) {
    if (!useFallback) {
      return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <BlurView
            blurType="light"
            blurAmount={5}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <View
            style={[
              style,
              {
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                backgroundColor: colors.modal.content,
                borderColor: colors.modal.border,
                borderRadius: borderRadius.xl,
              },
            ]}>
            {children}
          </View>
        </View>
      );
    } else {
      return (
        <LinearGradient
          colors={['rgba(111, 111, 111, 0.42)', 'rgba(20, 20, 20, 0.7)']}
          start={{x: 1, y: 0}}
          end={{x: 1, y: 1}}
          style={[
            style,
            {
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
            },
          ]}
          pointerEvents={pointerEvents as any}>
          <View
            style={{
              backgroundColor: 'black',
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              borderWidth: 3,
              borderColor: 'rgba(0, 0, 0, 0.04)',
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
  }

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      useAngle={true}
      angle={45}
      style={[
        style,
        {
          overflow: 'hidden',
          position: 'relative',
          borderRadius: borderRadius.xl,
        },
      ]}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background.primary,
          borderWidth: 3,
          borderColor: 'rgba(255, 254, 254, 0.04)',
          borderRadius: borderRadius.xl,
          zIndex: 10,
        }}>
        {children}
      </View>
    </LinearGradient>
  );
};
