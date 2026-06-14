import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StarDisplay({ rating, size = 16 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons 
        key={i} 
        name={i <= rating ? "star" : i - 0.5 <= rating ? "star-half" : "star-outline"} 
        size={size} 
        color="#f59e0b" 
      />
    );
  }
  return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
}
