import React from 'react';
import {Text, View} from 'react-native';

type CinemaProps = {
  type: string;
  id: number;
  season?: number;
  episode?: number;
};

const Cinema = ({type, id, season, episode}: CinemaProps) => {
  console.log(id);

  return (
    <View>
      <Text>Cinema</Text>
    </View>
  );
};

export default Cinema;
