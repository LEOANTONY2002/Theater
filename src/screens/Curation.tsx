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
import {FiltersScreen} from './Filters';
import {WatchlistsTabScreen} from './WatchlistsTab';
import {MyCollectionsTab} from './MyCollectionsTab';
import LinearGradient from 'react-native-linear-gradient';
import {BlurPreference} from '../store/blurPreference';
import {useResponsive} from '../hooks/useResponsive';

// Icons
import {Widget as WidgetBold} from '@solar-icons/react-native/dist/icons/settings/Bold/Widget.mjs';
import {Widget as WidgetLinear} from '@solar-icons/react-native/dist/icons/settings/Linear/Widget.mjs';
import {Bookmark as BookmarkBold} from '@solar-icons/react-native/dist/icons/school/Bold/Bookmark.mjs';
import {Bookmark as BookmarkLinear} from '@solar-icons/react-native/dist/icons/school/Linear/Bookmark.mjs';
import {Filter as FilterBold} from '@solar-icons/react-native/dist/icons/ui/Bold/Filter.mjs';
import {Filter as FilterLinear} from '@solar-icons/react-native/dist/icons/ui/Linear/Filter.mjs';

type TabType = 'filters' | 'watchlists' | 'collections';

export const CurationScreen = React.memo(() => {
  const [activeTab, setActiveTab] = useState<TabType>('filters');
  const [, setVersion] = React.useState(0);

  // Separate scroll values for each tab
  const scrollYFilters = useRef(new Animated.Value(0)).current;
  const scrollYWatchlists = useRef(new Animated.Value(0)).current;
  const scrollYCollections = useRef(new Animated.Value(0)).current;

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
    activeTab === 'filters'
      ? scrollYFilters
      : activeTab === 'watchlists'
      ? scrollYWatchlists
      : scrollYCollections;

  // Sync animation state when switching tabs
  useEffect(() => {
    const getCurrentScrollValue = () => {
      if (activeTab === 'filters') return scrollYFilters;
      if (activeTab === 'watchlists') return scrollYWatchlists;
      return scrollYCollections;
    };

    const scrollValue = getCurrentScrollValue();
    // @ts-ignore
    const currentValue = scrollValue._value || 0;
    const targetValue = currentValue > 50 ? 1 : 0;

    requestAnimationFrame(() => {
      animatedValue.setValue(targetValue);
      currentStateRef.current = targetValue;
    });
  }, [
    activeTab,
    scrollYFilters,
    scrollYWatchlists,
    scrollYCollections,
    animatedValue,
  ]);

  // Listen to current tab's scroll
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
      top: 30,
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
      borderColor: isGlass ? colors.modal.border : colors.modal.blurSolid,
      backgroundColor: isGlass
        ? colors.modal.blur
        : colors.background.tertiarySolid,
      overflow: 'hidden',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.round,
      alignSelf: 'center',
      elevation: isGlass ? 0 : 40,
    },
    tabButton: {
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    activeTabButton: {
      backgroundColor: isGlass
        ? colors.modal.header
        : colors.background.tertiary,
      borderColor: isGlass ? colors.modal.border : colors.background.tertiary,
      borderBottomWidth: isGlass ? 0 : 1,
      paddingVertical: 10,
      margin: 5,
    },
    tabText: {
      color: colors.text.secondary,
      ...typography.body1,
      fontSize: isTablet ? 14 : 11,
      fontWeight: '600',
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
      case 'filters':
        return isActive ? FilterBold : FilterLinear;
      case 'watchlists':
        return isActive ? BookmarkBold : BookmarkLinear;
      case 'collections':
        return isActive ? WidgetBold : WidgetLinear;
    }
  };

  const renderTabButton = (tab: TabType, label: string) => {
    const isActive = activeTab === tab;
    const iconSize = isTablet ? 24 : 20;
    const IconComponent = getIconComponent(tab, isActive);

    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => setActiveTab(tab)}>
        <View
          style={{
            paddingVertical: isTablet ? 10 : 3,
            paddingHorizontal: isTablet ? 16 : 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: -2,
          }}>
          <Animated.Text
            style={[
              styles.tabText,
              isActive && styles.activeTabText,
              {opacity: textOpacity},
            ]}>
            {label}
          </Animated.Text>

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

  const handleScrollFilters = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollYFilters}}}],
    {useNativeDriver: false},
  );

  const handleScrollWatchlists = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollYWatchlists}}}],
    {useNativeDriver: false},
  );

  const handleScrollCollections = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollYCollections}}}],
    {useNativeDriver: false},
  );

  return (
    <View style={{flex: 1, backgroundColor: colors.background.primary}}>
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
          {renderTabButton('filters', 'Filters')}
          {renderTabButton('watchlists', 'Watchlists')}
          {renderTabButton('collections', 'Collections')}
        </Animated.View>
      </View>

      <View
        style={{display: activeTab === 'filters' ? 'flex' : 'none', flex: 1}}>
        <FiltersScreen
          onScroll={handleScrollFilters}
          scrollEventThrottle={16}
        />
      </View>
      <View
        style={{
          display: activeTab === 'watchlists' ? 'flex' : 'none',
          flex: 1,
        }}>
        <WatchlistsTabScreen
          onScroll={handleScrollWatchlists}
          scrollEventThrottle={16}
        />
      </View>
      <View
        style={{
          display: activeTab === 'collections' ? 'flex' : 'none',
          flex: 1,
        }}>
        <MyCollectionsTab
          onScroll={handleScrollCollections}
          scrollEventThrottle={16}
        />
      </View>
    </View>
  );
});
