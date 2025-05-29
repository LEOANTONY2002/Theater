import React, {useState} from 'react';
import {View, Image, StyleSheet} from 'react-native';
import {PersonCardSkeleton} from './LoadingSkeleton';

interface PersonCardProps {
  item: string;
  onPress: (item: string) => void;
  size?: 'normal' | 'large';
}

export const PersonCard: React.FC<PersonCardProps> = ({item}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <View style={styles.container}>
      {!imageLoaded && <PersonCardSkeleton />}
      <Image
        source={{
          uri: item ? item : 'https://via.placeholder.com/300x450',
        }}
        style={[
          styles.poster,
          !imageLoaded && {position: 'absolute', width: 0, height: 0},
        ]}
        resizeMode="cover"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(true)}
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
    backgroundColor: '#2a2a2a',
  },
});
