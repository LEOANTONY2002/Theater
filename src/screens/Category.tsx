import React from 'react';
import {View, Text} from 'react-native';
import {colors} from '../theme';

export const CategoryScreen = () => {
  return (
    <View style={{flex: 1, backgroundColor: colors.background.primary}}>
      <Text style={{color: colors.text.primary}}>Category Screen</Text>
    </View>
  );
};
