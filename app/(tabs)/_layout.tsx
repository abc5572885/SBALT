/**
 * Protected Tabs Layout with center SBALT button
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/useAppStore';
import * as Haptics from 'expo-haptics';

const PIE_OUTER = 86;
const PIE_INNER = 50;
const SVG_PAD = 14;
const CANVAS = (PIE_OUTER + SVG_PAD) * 2;
const MID_R = (PIE_INNER + PIE_OUTER) / 2;
const WEDGE_GAP_RAD = (7 * Math.PI) / 180;

type Direction = 'center' | 'up' | 'right' | 'down' | 'left';

const SPORT_BY_DIR: Record<Direction, string> = {
  center: 'all',
  up: 'basketball',
  right: 'volleyball',
  down: 'badminton',
  left: 'running',
};

interface Wedge {
  dir: Exclude<Direction, 'center'>;
  label: string;
  icon: 'basketball' | 'volleyball' | 'badminton' | 'run';
  center: number;
}

const HALF_PI = Math.PI / 2;
const QUARTER_PI = Math.PI / 4;

const WEDGES: Wedge[] = [
  { dir: 'up', label: '籃球', icon: 'basketball', center: -HALF_PI },
  { dir: 'right', label: '排球', icon: 'volleyball', center: 0 },
  { dir: 'down', label: '羽球', icon: 'badminton', center: HALF_PI },
  { dir: 'left', label: '跑步', icon: 'run', center: Math.PI },
];

function wedgePath(cx: number, cy: number, rIn: number, rOut: number, centerAngle: number): string {
  const sweep = HALF_PI - WEDGE_GAP_RAD;
  const startAngle = centerAngle - sweep / 2;
  const endAngle = centerAngle + sweep / 2;
  const x1 = cx + rOut * Math.cos(startAngle);
  const y1 = cy + rOut * Math.sin(startAngle);
  const x2 = cx + rOut * Math.cos(endAngle);
  const y2 = cy + rOut * Math.sin(endAngle);
  const x3 = cx + rIn * Math.cos(endAngle);
  const y3 = cy + rIn * Math.sin(endAngle);
  const x4 = cx + rIn * Math.cos(startAngle);
  const y4 = cy + rIn * Math.sin(startAngle);
  return `M ${x1} ${y1} A ${rOut} ${rOut} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 0 0 ${x4} ${y4} Z`;
}

function getDirection(dx: number, dy: number, shiftUp: number): Direction {
  const px = dx;
  const py = dy + shiftUp;
  const dist = Math.hypot(px, py);
  if (dist < PIE_INNER) return 'center';
  const angle = Math.atan2(py, px);
  if (angle >= -3 * QUARTER_PI && angle < -QUARTER_PI) return 'up';
  if (angle >= -QUARTER_PI && angle < QUARTER_PI) return 'right';
  if (angle >= QUARTER_PI && angle < 3 * QUARTER_PI) return 'down';
  return 'left';
}

function CenterButton() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { setSelectedSport } = useAppStore();
  const [active, setActive] = useState(false);
  const [direction, setDirection] = useState<Direction>('center');
  const directionRef = useRef<Direction>('center');
  const shiftUpRef = useRef(0);
  const [shiftUp, setShiftUp] = useState(0);
  const buttonRef = useRef<View>(null);
  const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });

  // Entry animation
  const entryScale = useRef(new Animated.Value(0.88)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Per-wedge scale (selection animation)
  const scales = useRef({
    center: new Animated.Value(1),
    up: new Animated.Value(1),
    right: new Animated.Value(1),
    down: new Animated.Value(1),
    left: new Animated.Value(1),
  }).current;

  // Center pulse loop
  const pulse = useRef(new Animated.Value(1)).current;

  const setDir = (d: Direction) => {
    if (directionRef.current !== d) {
      directionRef.current = d;
      setDirection(d);
      Haptics.selectionAsync();
    }
  };

  // Animate entry / exit
  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.spring(entryScale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }),
        Animated.timing(entryOpacity, { toValue: 1, duration: 140, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      entryScale.setValue(0.88);
      entryOpacity.setValue(0);
      overlayOpacity.setValue(0);
    }
  }, [active, entryScale, entryOpacity, overlayOpacity]);

  // Animate selection scale
  useEffect(() => {
    (Object.keys(scales) as Direction[]).forEach((dir) => {
      Animated.spring(scales[dir], {
        toValue: direction === dir ? 1.14 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 140,
      }).start();
    });
  }, [direction, scales]);

  // Pulse loop on center when active and center selected
  useEffect(() => {
    if (active && direction === 'center') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.05, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulse.setValue(1);
    }
  }, [active, direction, pulse]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        directionRef.current = 'center';
        setDirection('center');
        buttonRef.current?.measureInWindow((x, y, w, h) => {
          const cyAbs = y + h / 2;
          const screenH = Dimensions.get('window').height;
          const spaceBelow = screenH - cyAbs - insets.bottom;
          const required = Math.max(0, PIE_OUTER - spaceBelow + 14);
          const shift = Math.min(required, PIE_INNER - 6);
          shiftUpRef.current = shift;
          setShiftUp(shift);
          setCenterPos({ x: x + w / 2, y: cyAbs });
          setActive(true);
        });
      },
      onPanResponderMove: (_, g) => {
        setDir(getDirection(g.dx, g.dy, shiftUpRef.current));
      },
      onPanResponderRelease: () => {
        setSelectedSport(SPORT_BY_DIR[directionRef.current]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setActive(false);
      },
      onPanResponderTerminate: () => setActive(false),
    }),
  ).current;

  const cx = CANVAS / 2;
  const cy = CANVAS / 2;

  return (
    <>
      <View ref={buttonRef} {...panResponder.panHandlers} collapsable={false}>
        <View style={[styles.centerButton, { backgroundColor: colors.text }, Shadows.lg]}>
          <Text style={[styles.centerButtonText, { color: colors.background }]}>S</Text>
        </View>
      </View>

      <Modal visible={active} transparent animationType="none" statusBarTranslucent>
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
          pointerEvents="none"
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 40 : 80}
            tint={colorScheme === 'dark' ? 'dark' : 'systemMaterialDark'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(10, 14, 22, 0.18)' },
            ]}
          />
        </Animated.View>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View
            style={[
              styles.pieContainer,
              {
                left: centerPos.x - cx,
                top: centerPos.y - cy - shiftUp,
                opacity: entryOpacity,
                transform: [{ scale: entryScale }],
              },
            ]}
          >
            <Svg width={CANVAS} height={CANVAS} style={StyleSheet.absoluteFill}>
              {/* Wedges */}
              {WEDGES.map((w) => (
                <Path
                  key={w.dir}
                  d={wedgePath(cx, cy, PIE_INNER, PIE_OUTER, w.center)}
                  fill={direction === w.dir ? colors.primary : colors.surface}
                />
              ))}

              {/* Center hole */}
              <SvgCircle
                cx={cx}
                cy={cy}
                r={PIE_INNER - 5}
                fill={direction === 'center' ? colors.primary : colors.surface}
              />

              {/* Subtle inner ring (always visible) for definition */}
              <SvgCircle
                cx={cx}
                cy={cy}
                r={PIE_INNER - 5}
                fill="none"
                stroke={direction === 'center' ? colors.primary : colors.border}
                strokeWidth={1}
                opacity={0.5}
              />
            </Svg>

            {/* Wedge content overlays */}
            {WEDGES.map((w) => {
              const x = cx + MID_R * Math.cos(w.center);
              const y = cy + MID_R * Math.sin(w.center);
              const isActive = direction === w.dir;
              const fg = isActive ? colors.primaryText : colors.text;
              return (
                <Animated.View
                  key={w.dir}
                  style={[
                    styles.wedgeContent,
                    {
                      left: x - 32,
                      top: y - 24,
                      transform: [{ scale: scales[w.dir] }],
                    },
                  ]}
                >
                  <MaterialCommunityIcons name={w.icon} size={22} color={fg} />
                  <Text style={[styles.wedgeLabel, { color: fg }]}>{w.label}</Text>
                </Animated.View>
              );
            })}

            {/* Center 全部 */}
            <Animated.View
              style={[
                styles.centerContent,
                {
                  left: cx - 30,
                  top: cy - 12,
                  transform: [
                    { scale: Animated.multiply(scales.center, pulse) },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.centerLabel,
                  { color: direction === 'center' ? colors.primaryText : colors.text },
                ]}
              >
                全部
              </Text>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scores"
        options={{
          title: '社群',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="center"
        options={{
          title: '',
          tabBarButton: () => <CenterButton />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '數據',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: '發現',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 88,
    paddingBottom: 28,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    alignSelf: 'center',
  },
  centerButtonText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -1,
  },
  pieContainer: {
    position: 'absolute',
    width: CANVAS,
    height: CANVAS,
    ...Shadows.lg,
  },
  wedgeContent: {
    position: 'absolute',
    width: 64,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  wedgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  centerContent: {
    position: 'absolute',
    width: 60,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
