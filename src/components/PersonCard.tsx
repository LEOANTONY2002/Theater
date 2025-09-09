import React, {useState, useCallback, useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';
import FastImage from 'react-native-fast-image';
import {colors} from '../styles/theme';

interface PersonCardProps {
  item: string;
  onPress: (item: string) => void;
  size?: 'normal' | 'large';
}

export const PersonCard: React.FC<PersonCardProps> = ({item}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const handleImageFinish = useCallback(() => {
    setImageLoaded(true);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerAnim]);

  return (
    <View style={styles.container}>
      <FastImage
        source={{uri: item || 'https://via.placeholder.com/300x450'}}
        style={styles.poster}
        resizeMode={FastImage.resizeMode.cover}
        onLoad={handleImageFinish}
        onError={handleImageFinish}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    borderRadius: 8,
    overflow: 'hidden',
    margin: 5,
    zIndex: -1,
  },
  poster: {
    width: 100,
    height: 150,
    backgroundColor: colors.background.card,
  },
  skeleton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    opacity: 0.7,
  },
});
