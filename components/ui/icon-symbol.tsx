// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'location.fill': 'location-on',
  'calendar': 'event',
  'person.fill': 'person',
  'sportscourt.fill': 'sports-basketball',
  'plus': 'add',
  'gearshape.fill': 'settings',
  'arrow.right.square': 'logout',
  'pencil': 'edit',
  'trash': 'delete',
  'arrow.clockwise': 'refresh',
  'magnifyingglass': 'search',
  'bolt.fill': 'flash-on',
  'chart.bar.fill': 'bar-chart',
  'hand.raised.fill': 'pan-tool',
  'star.fill': 'star',
  'ellipsis': 'more-horiz',
  'camera.fill': 'photo-camera',
  'f.square.fill': 'facebook',
  'message.fill': 'chat',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
