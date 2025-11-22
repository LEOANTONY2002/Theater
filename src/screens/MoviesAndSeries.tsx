import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {MoviesScreen} from './Movies';
import {TVShowsScreen} from './TVShows';
import LinearGradient from 'react-native-linear-gradient';
import {BlurPreference} from '../store/blurPreference';
import {useResponsive} from '../hooks/useResponsive';

type TabType = 'movies' | 'series';

export const MoviesAndSeriesScreen = React.memo(() => {
  const [activeTab, setActiveTab] = useState<TabType>('movies');
  const [, setVersion] = React.useState(0);
  React.useEffect(() => {
    BlurPreference.init();
    const unsub = BlurPreference.subscribe(() => setVersion(v => v + 1));
    return unsub;
  }, []);
  const themeMode = BlurPreference.getMode();
  const isGlass = themeMode === 'glass';
  const {isTablet} = useResponsive();

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
    blurContainer: {
      ...StyleSheet.absoluteFillObject,
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
    },
    tabContentContainer: {
      gap: spacing.sm,
      alignItems: 'center',
    },
    tabButton: {
      paddingVertical: isTablet ? spacing.md : 14,
      paddingHorizontal: isTablet ? spacing.lg : 14,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center',
    },
    activeTabButton: {
      backgroundColor: isGlass
        ? colors.modal.header
        : colors.background.primary,
      borderColor: colors.modal.border,
      borderBottomWidth: 0,
      margin: 5,
    },
    tabText: {
      color: colors.text.secondary,
      ...typography.body1,
      fontSize: isTablet ? 14 : 12,
      fontWeight: '600',
    },
    activeTabText: {
      color: colors.text.primary,
    },
  });

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}>
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Fixed Header with Tabs */}
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
        <View style={styles.header}>
          {renderTabButton('movies', 'Movies')}
          {renderTabButton('series', 'Series')}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'movies' ? <MoviesScreen /> : <TVShowsScreen />}
    </>
  );
});
