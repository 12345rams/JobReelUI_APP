import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StarInput({ rating, onRatingChange, size = 28 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 8 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} onPress={() => onRatingChange(i)}>
          <Ionicons name={i <= rating ? "star" : "star-outline"} size={size} color="#f59e0b" />
        </TouchableOpacity>
      ))}
    </View>
  );
}
