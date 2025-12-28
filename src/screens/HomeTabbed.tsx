import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {HomeScreen} from './Home';
import {MoviesScreen} from './Movies';
import {TVShowsScreen} from './TVShows';
import LinearGradient from 'react-native-linear-gradient';
import {BlurPreference} from '../store/blurPreference';
import {useResponsive} from '../hooks/useResponsive';
import {Home as HomeBold} from '@solar-icons/react-native/dist/icons/ui/Bold/Home.mjs';
import {Home as HomeLinear} from '@solar-icons/react-native/dist/icons/ui/Linear/Home.mjs';
import {VideoFrame2 as VideoFrame2Bold} from '@solar-icons/react-native/dist/icons/video/Bold/VideoFrame2.mjs';
import {VideoFrame2 as VideoFrame2Linear} from '@solar-icons/react-native/dist/icons/video/Linear/VideoFrame2.mjs';
import {Display as DisplayBold} from '@solar-icons/react-native/dist/icons/devices/Bold/Display.mjs';
import {Display as DisplayLinear} from '@solar-icons/react-native/dist/icons/devices/Linear/Display.mjs';

type TabType = 'all' | 'movies' | 'tv';

export const HomeTabbedScreen = React.memo(() => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [, setVersion] = React.useState(0);

  // Separate scroll values for each tab
  const scrollYAll = useRef(new Animated.Value(0)).current;
  const scrollYMovies = useRef(new Animated.Value(0)).current;
  const scrollYTV = useRef(new Animated.Value(0)).current;

  const animatedValue = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);
  const currentStateRef = useRef(0); // 0 = text visible, 1 = icons visible

  React.useEffect(() => {
    BlurPreference.init();
    const unsub = BlurPreference.subscribe(() => setVersion(v => v + 1));
    return unsub;
  }, []);
  const themeMode = BlurPreference.getMode();
  const isGlass = themeMode === 'glass';
  const {isTablet} = useResponsive();

  // Get current scroll value based on active tab
  const currentScrollY =
    activeTab === 'all'
      ? scrollYAll
      : activeTab === 'movies'
      ? scrollYMovies
      : scrollYTV;

  // Sync animation state when switching tabs
  useEffect(() => {
    const getCurrentScrollValue = () => {
      if (activeTab === 'all') return scrollYAll;
      if (activeTab === 'movies') return scrollYMovies;
      return scrollYTV;
    };

    const scrollValue = getCurrentScrollValue();
    // @ts-ignore
    const currentValue = scrollValue._value || 0;
    const targetValue = currentValue > 50 ? 1 : 0;

    requestAnimationFrame(() => {
      animatedValue.setValue(targetValue);
      currentStateRef.current = targetValue;
    });
  }, [activeTab, scrollYAll, scrollYMovies, scrollYTV, animatedValue]);

  // Listen to current tab's scroll and trigger smooth timing animation
  useEffect(() => {
    let cooldownTimer: NodeJS.Timeout | null = null;

    const listener = currentScrollY.addListener(({value}) => {
      const isScrollingDown = value > (currentStateRef.current === 0 ? 50 : 30);
      const targetValue = isScrollingDown ? 1 : 0;

      if (targetValue !== currentStateRef.current && !isAnimatingRef.current) {
        isAnimatingRef.current = true;
        currentStateRef.current = targetValue;

        Animated.timing(animatedValue, {
          toValue: targetValue,
          duration: 250,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }).start(() => {
          cooldownTimer = setTimeout(() => {
            isAnimatingRef.current = false;
          }, 100);
        });
      }
    });

    return () => {
      currentScrollY.removeListener(listener);
      if (cooldownTimer) clearTimeout(cooldownTimer);
    };
  }, [currentScrollY, animatedValue]);

  // Animated values
  const textOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const iconOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const tabScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.85],
  });

  const styles = StyleSheet.create({
    headerContainer: {
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.round,
      pointerEvents: 'box-none',
    },
    header: {
      borderWidth: 1,
      borderBottomWidth: isGlass ? 0 : 1,
      borderColor: isGlass ? colors.modal.border : 'rgba(164, 164, 164, 0.15)',
      backgroundColor: isGlass ? colors.modal.blur : colors.modal.active,
      overflow: 'hidden',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.round,
      alignSelf: 'center',
    },
    tabButton: {
      paddingVertical: isTablet ? spacing.md : 10,
      paddingHorizontal: isTablet ? spacing.lg : 14,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    activeTabButton: {
      backgroundColor: isGlass
        ? colors.modal.header
        : colors.background.primary,
      borderColor: colors.modal.border,
      borderBottomWidth: 0,
      margin: 5,
      paddingHorizontal: isTablet ? spacing.lg : 14,
    },
    tabText: {
      color: colors.text.secondary,
      ...typography.body1,
      fontSize: isTablet ? 14 : 12,
      fontWeight: '600',
      position: 'absolute',
    },
    activeTabText: {
      color: colors.text.primary,
    },
    tabIcon: {
      position: 'absolute',
    },
  });

  const getIconComponent = (tab: TabType, isActive: boolean) => {
    switch (tab) {
      case 'all':
        return isActive ? HomeBold : HomeLinear;
      case 'movies':
        return isActive ? VideoFrame2Bold : VideoFrame2Linear;
      case 'tv':
        return isActive ? DisplayBold : DisplayLinear;
    }
  };

  const renderTabButton = (tab: TabType, label: string) => {
    const isActive = activeTab === tab;
    const iconSize = isTablet ? 24 : 24;
    const IconComponent = getIconComponent(tab, isActive);

    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => setActiveTab(tab)}>
        <View
          style={{
            paddingVertical: isTablet ? 14 : 12,
            paddingHorizontal: isTablet ? 14 : 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {/* Text - fades out on scroll */}
          <Animated.Text
            style={[
              styles.tabText,
              isActive && styles.activeTabText,
              {opacity: textOpacity},
            ]}>
            {label}
          </Animated.Text>

          {/* Icon - fades in on scroll */}
          <Animated.View
            style={[styles.tabIcon, {opacity: iconOpacity}]}
            pointerEvents="none">
            <IconComponent
              size={iconSize}
              color={isActive ? colors.text.primary : colors.text.secondary}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleScrollAll = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollYAll}}}],
    {useNativeDriver: false},
  );

  const handleScrollMovies = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollYMovies}}}],
    {useNativeDriver: false},
  );

  const handleScrollTV = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollYTV}}}],
    {useNativeDriver: false},
  );

  return (
    <>
      <LinearGradient
        colors={[colors.background.primary, 'transparent', 'transparent']}
        style={{
          height: 250,
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <View style={styles.headerContainer}>
        <Animated.View
          style={[styles.header, {transform: [{scale: tabScale}]}]}>
          {renderTabButton('all', 'All')}
          {renderTabButton('movies', 'Movies')}
          {renderTabButton('tv', 'TV')}
        </Animated.View>
      </View>

      <View style={{display: activeTab === 'all' ? 'flex' : 'none', flex: 1}}>
        <HomeScreen onScroll={handleScrollAll} scrollEventThrottle={16} />
      </View>
      <View
        style={{display: activeTab === 'movies' ? 'flex' : 'none', flex: 1}}>
        <MoviesScreen onScroll={handleScrollMovies} scrollEventThrottle={16} />
      </View>
      <View style={{display: activeTab === 'tv' ? 'flex' : 'none', flex: 1}}>
        <TVShowsScreen onScroll={handleScrollTV} scrollEventThrottle={16} />
      </View>
    </>
  );
});
