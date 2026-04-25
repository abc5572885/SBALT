// SBALT icons — using Feather (clean 2px stroke, modern minimal aesthetic
// matching the SBALT bold/sharp brand). Feather icon names are stable;
// keys still use SF Symbol naming for legacy compatibility.

import Feather from '@expo/vector-icons/Feather';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type FeatherName = ComponentProps<typeof Feather>['name'];

const MAPPING = {
  // Navigation
  'house.fill': 'home',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'chevron.left.forwardslash.chevron.right': 'code',

  // Actions
  'plus': 'plus',
  'pencil': 'edit-2',
  'trash': 'trash-2',
  'arrow.clockwise': 'refresh-cw',
  'magnifyingglass': 'search',
  'square.and.arrow.up': 'share',
  'xmark': 'x',
  'arrow.right.square': 'log-out',
  'gearshape.fill': 'settings',
  'ellipsis': 'more-horizontal',
  'checkmark.circle': 'check-circle',
  'compass.fill': 'compass',
  'map.fill': 'map',

  // Communication
  'paperplane.fill': 'send',
  'envelope.fill': 'mail',
  'message.fill': 'message-square',

  // Content
  'heart': 'heart',
  'heart.fill': 'heart',
  'star.fill': 'star',
  'bolt.fill': 'zap',
  'camera.fill': 'camera',

  // Info
  'location.fill': 'map-pin',
  'calendar': 'calendar',
  'clock.fill': 'clock',
  'chart.bar.fill': 'bar-chart-2',
  'person.fill': 'user',
  'person.2.fill': 'users',
  'medal.fill': 'award',

  // Sport (generic — Feather has no sport-specific icons; target = concentric circles)
  'sportscourt.fill': 'target',

  // Pan / move (TacticalBoard non-draw mode)
  'hand.raised.fill': 'move',

  // Brand
  'f.square.fill': 'facebook',
} as Record<string, FeatherName>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * Icon wrapper using Feather. Pass an SF Symbol-style key from MAPPING.
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
}) {
  return <Feather color={color} size={size} name={MAPPING[name]} style={style} />;
}
