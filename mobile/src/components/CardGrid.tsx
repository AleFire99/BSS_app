import React from 'react';
import { FlatList, Image, TouchableOpacity, StyleSheet, Dimensions, View } from 'react-native';
import { Card } from '../types';
import { theme } from '../theme';

const COLS = 3;
const CELL_W = (Dimensions.get('window').width - 24) / COLS;
const CELL_H = CELL_W * 1.4;

interface Props {
  cards: Card[];
  onPress: (card: Card) => void;
  onEndReached?: () => void;
  footer?: React.ReactElement | null;
}

export default function CardGrid({ cards, onPress, onEndReached, footer }: Props) {
  return (
    <FlatList
      data={cards}
      keyExtractor={c => c.id}
      numColumns={COLS}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.cell} onPress={() => onPress(item)} activeOpacity={0.75}>
          <Image
            source={{ uri: `https://www.bssdb.dev/cards/bss/${item.id}.png` }}
            style={styles.image}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={footer}
      contentContainerStyle={styles.content}
      initialNumToRender={30}
      maxToRenderPerBatch={30}
      windowSize={10}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 4 },
  cell:    { width: CELL_W, height: CELL_H, padding: 2 },
  image:   { flex: 1, borderRadius: 4, backgroundColor: theme.border },
});
