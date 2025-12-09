import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {FiltersScreen} from './Filters';
import {WatchlistsTabScreen} from './WatchlistsTab';
import {MyCollectionsTab} from './MyCollectionsTab';
import LinearGradient from 'react-native-linear-gradient';
import {BlurPreference} from '../store/blurPreference';
import {useResponsive} from '../hooks/useResponsive';

type TabType = 'filters' | 'watchlists' | 'collections';

export const CurationScreen = React.memo(() => {
  const [activeTab, setActiveTab] = useState<TabType>('filters');
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
    header: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 1,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.round,
      pointerEvents: 'box-none',
    },
    blurContainer: {
      ...StyleSheet.absoluteFillObject,
    },
    tabContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderBottomWidth: isGlass ? 0 : 1,
      borderColor: isGlass ? colors.modal.border : 'rgba(164, 164, 164, 0.15)',
      backgroundColor: isGlass ? colors.modal.blur : colors.modal.active,
      borderRadius: borderRadius.round,
      zIndex: 2,
      marginTop: 30,
    },
    tabContentContainer: {
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
    contentContainer: {
      flex: 1,
    },
  });

  return (
    <View style={{flex: 1, backgroundColor: colors.background.primary}}>
      <View style={styles.header}>
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
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'filters' && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab('filters')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'filters' && styles.activeTabText,
              ]}>
              My Filters
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'watchlists' && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab('watchlists')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'watchlists' && styles.activeTabText,
              ]}>
              Watchlists
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'collections' && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab('collections')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'collections' && styles.activeTabText,
              ]}>
              Collections
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View
          style={{display: activeTab === 'filters' ? 'flex' : 'none', flex: 1}}>
          <FiltersScreen />
        </View>
        <View
          style={{
            display: activeTab === 'watchlists' ? 'flex' : 'none',
            flex: 1,
          }}>
          <WatchlistsTabScreen />
        </View>
        <View
          style={{
            display: activeTab === 'collections' ? 'flex' : 'none',
            flex: 1,
          }}>
          <MyCollectionsTab />
        </View>
      </View>
    </View>
  );
});
