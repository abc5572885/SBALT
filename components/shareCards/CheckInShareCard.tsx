import { CheckIn } from '@/services/checkIns';
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;

type GradientStops = [string, string, ...string[]];

interface SportTheme {
  accent: string;
  accentSoft: string;
  label: string;
  bg: GradientStops;
  bgStart: { x: number; y: number };
  bgEnd: { x: number; y: number };
  glowPos: { top?: number; bottom?: number; left?: number; right?: number; size: number; opacity: number };
  watermark: string;
  motif: ReactNode;
}

// ─── Sport-specific motifs (drawn behind hero) ─────────────────────────────

const BasketballMotif = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    {/* 3-point arc at bottom-left */}
    <Path
      d="M -40 540 Q 180 360 400 540"
      stroke="#FF6B35"
      strokeOpacity={0.18}
      strokeWidth={1.5}
      fill="none"
    />
    <Path
      d="M -40 580 Q 180 400 400 580"
      stroke="#FF6B35"
      strokeOpacity={0.10}
      strokeWidth={1}
      fill="none"
    />
    {/* Free throw circle hint */}
    <Circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT - 10} r={140} stroke="#FF6B35" strokeOpacity={0.12} strokeWidth={1} fill="none" />
  </Svg>
);

const VolleyballMotif = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    {/* Net diagonal cross-hatch lines top half */}
    {Array.from({ length: 12 }).map((_, i) => (
      <Line
        key={`a${i}`}
        x1={-40 + i * 40}
        y1={0}
        x2={40 + i * 40}
        y2={120}
        stroke="#FFC107"
        strokeOpacity={0.08}
        strokeWidth={1}
      />
    ))}
    {Array.from({ length: 12 }).map((_, i) => (
      <Line
        key={`b${i}`}
        x1={40 + i * 40}
        y1={0}
        x2={-40 + i * 40}
        y2={120}
        stroke="#FFC107"
        strokeOpacity={0.06}
        strokeWidth={1}
      />
    ))}
    {/* Horizontal net edge */}
    <Line x1={0} y1={120} x2={CARD_WIDTH} y2={120} stroke="#FFC107" strokeOpacity={0.25} strokeWidth={1} />
  </Svg>
);

const BadmintonMotif = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    {/* Shuttle trajectory diagonal trail */}
    <Defs>
      <SvgLinearGradient id="shuttle" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#22D3A6" stopOpacity={0.4} />
        <Stop offset="100%" stopColor="#22D3A6" stopOpacity={0} />
      </SvgLinearGradient>
    </Defs>
    {/* Curved shuttle path */}
    <Path
      d={`M ${CARD_WIDTH + 20} -20 Q ${CARD_WIDTH * 0.4} ${CARD_HEIGHT * 0.4} -40 ${CARD_HEIGHT + 40}`}
      stroke="url(#shuttle)"
      strokeWidth={2}
      fill="none"
      strokeDasharray="4 8"
    />
    {/* Net lines bottom */}
    <Line x1={0} y1={CARD_HEIGHT - 80} x2={CARD_WIDTH} y2={CARD_HEIGHT - 80} stroke="#22D3A6" strokeOpacity={0.18} strokeWidth={1} />
    {Array.from({ length: 14 }).map((_, i) => (
      <Line
        key={`n${i}`}
        x1={i * 28}
        y1={CARD_HEIGHT - 80}
        x2={i * 28}
        y2={CARD_HEIGHT - 60}
        stroke="#22D3A6"
        strokeOpacity={0.12}
        strokeWidth={0.8}
      />
    ))}
  </Svg>
);

const RunningMotif = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    {/* Route path winding through */}
    <Path
      d={`M -20 ${CARD_HEIGHT * 0.65} C ${CARD_WIDTH * 0.3} ${CARD_HEIGHT * 0.55}, ${CARD_WIDTH * 0.5} ${CARD_HEIGHT * 0.78}, ${CARD_WIDTH * 0.7} ${CARD_HEIGHT * 0.62} S ${CARD_WIDTH + 40} ${CARD_HEIGHT * 0.68}, ${CARD_WIDTH + 60} ${CARD_HEIGHT * 0.6}`}
      stroke="#3B82F6"
      strokeOpacity={0.32}
      strokeWidth={2}
      strokeDasharray="6 6"
      fill="none"
    />
    {/* Start dot */}
    <Circle cx={20} cy={CARD_HEIGHT * 0.66} r={4} fill="#3B82F6" />
    {/* End pin */}
    <Circle cx={CARD_WIDTH - 30} cy={CARD_HEIGHT * 0.61} r={5} fill="#3B82F6" />
    <Circle cx={CARD_WIDTH - 30} cy={CARD_HEIGHT * 0.61} r={10} stroke="#3B82F6" strokeOpacity={0.4} strokeWidth={1} fill="none" />
  </Svg>
);

const OtherMotif = () => (
  <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={StyleSheet.absoluteFill}>
    <Circle cx={CARD_WIDTH * 0.85} cy={CARD_HEIGHT * 0.85} r={60} stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={1} fill="none" />
    <Circle cx={CARD_WIDTH * 0.85} cy={CARD_HEIGHT * 0.85} r={100} stroke="#FFFFFF" strokeOpacity={0.05} strokeWidth={1} fill="none" />
  </Svg>
);

// ─── Themes ────────────────────────────────────────────────────────────────

const SPORT_THEME: Record<string, SportTheme> = {
  basketball: {
    accent: '#FF6B35',
    accentSoft: '#FF8C5A',
    label: 'BASKETBALL',
    bg: ['#1A0805', '#2A0A08', '#4A1208'],
    bgStart: { x: 0, y: 0 },
    bgEnd: { x: 1, y: 1 },
    glowPos: { top: -100, right: -120, size: 380, opacity: 0.22 },
    watermark: 'BASKETBALL',
    motif: <BasketballMotif />,
  },
  volleyball: {
    accent: '#FFC107',
    accentSoft: '#FFD75A',
    label: 'VOLLEYBALL',
    bg: ['#1F0F08', '#3A1F0F', '#5A3010'],
    bgStart: { x: 0, y: 0 },
    bgEnd: { x: 0, y: 1 },
    glowPos: { bottom: -140, right: -100, size: 360, opacity: 0.20 },
    watermark: 'VOLLEYBALL',
    motif: <VolleyballMotif />,
  },
  badminton: {
    accent: '#22D3A6',
    accentSoft: '#5EE6C5',
    label: 'BADMINTON',
    bg: ['#051A12', '#0A2A1F', '#0E3A2A'],
    bgStart: { x: 1, y: 0 },
    bgEnd: { x: 0, y: 1 },
    glowPos: { top: -120, left: -120, size: 340, opacity: 0.22 },
    watermark: 'BADMINTON',
    motif: <BadmintonMotif />,
  },
  running: {
    accent: '#3B82F6',
    accentSoft: '#60A5FA',
    label: 'RUNNING',
    bg: ['#050C20', '#0A1B40', '#0F2A55'],
    bgStart: { x: 0, y: 0 },
    bgEnd: { x: 1, y: 1 },
    glowPos: { top: -100, right: -100, size: 320, opacity: 0.25 },
    watermark: 'RUNNING',
    motif: <RunningMotif />,
  },
  other: {
    accent: '#FFFFFF',
    accentSoft: '#E5E5E5',
    label: 'SPORT',
    bg: ['#0F0F12', '#161618', '#1F1F22'],
    bgStart: { x: 0, y: 0 },
    bgEnd: { x: 1, y: 1 },
    glowPos: { top: -100, right: -100, size: 320, opacity: 0.10 },
    watermark: 'SPORT',
    motif: <OtherMotif />,
  },
};

interface HeroStat {
  value: string;
  label: string;
}

interface SecondaryStat {
  value: string;
  label: string;
}

function buildStats(checkIn: CheckIn): { hero: HeroStat; secondary: SecondaryStat[] } {
  const s = checkIn.stats || {};
  switch (checkIn.sport_type) {
    case 'basketball': {
      const hero: HeroStat = { value: String(s.points ?? 0), label: 'POINTS' };
      const secondary: SecondaryStat[] = [
        { value: String(s.games ?? 0), label: 'GAMES' },
        { value: String(s.threes ?? 0), label: '3PT' },
        { value: String(s.rebounds ?? 0), label: 'REB' },
        { value: String(s.assists ?? 0), label: 'AST' },
      ];
      return { hero, secondary };
    }
    case 'volleyball': {
      const hero: HeroStat = { value: String(s.points ?? 0), label: 'POINTS' };
      const secondary: SecondaryStat[] = [
        { value: String(s.games ?? 0), label: 'GAMES' },
        { value: String(s.kills ?? 0), label: 'KILLS' },
        { value: String(s.blocks ?? 0), label: 'BLK' },
        { value: String(s.aces ?? 0), label: 'ACE' },
      ];
      return { hero, secondary };
    }
    case 'badminton': {
      const won = Number(s.games_won ?? 0);
      const lost = Number(s.games_lost ?? 0);
      const hero: HeroStat = { value: `${won}-${lost}`, label: 'SETS' };
      const secondary: SecondaryStat[] = [
        { value: String(won), label: 'WON' },
        { value: String(lost), label: 'LOST' },
        { value: String(s.smashes ?? 0), label: 'SMASH' },
      ];
      return { hero, secondary };
    }
    default: {
      const entries = Object.entries(s).slice(0, 5);
      const hero: HeroStat = entries[0]
        ? { value: String(entries[0][1]), label: String(entries[0][0]).toUpperCase() }
        : { value: '–', label: 'STATS' };
      const secondary: SecondaryStat[] = entries.slice(1).map(([k, v]) => ({
        value: String(v),
        label: k.toUpperCase(),
      }));
      return { hero, secondary };
    }
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} · ${hh}:${min}`;
}

interface Props {
  checkIn: CheckIn;
  displayName: string;
}

export const CheckInShareCard = forwardRef<View, Props>(({ checkIn, displayName }, ref) => {
  const theme = SPORT_THEME[checkIn.sport_type] || SPORT_THEME.other;
  const { hero, secondary } = buildStats(checkIn);

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      {/* Background gradient */}
      <LinearGradient
        colors={theme.bg}
        start={theme.bgStart}
        end={theme.bgEnd}
        style={StyleSheet.absoluteFill}
      />

      {/* Sport motif (SVG decoration) */}
      {theme.motif}

      {/* Watermark sport name behind everything */}
      <Text
        style={[
          styles.watermark,
          { color: theme.accent, opacity: 0.06 },
        ]}
        numberOfLines={1}
      >
        {theme.watermark}
      </Text>

      {/* Accent glow blob */}
      <View
        style={[
          styles.glow,
          {
            backgroundColor: theme.accent,
            opacity: theme.glowPos.opacity,
            width: theme.glowPos.size,
            height: theme.glowPos.size,
            borderRadius: theme.glowPos.size / 2,
            top: theme.glowPos.top,
            bottom: theme.glowPos.bottom,
            left: theme.glowPos.left,
            right: theme.glowPos.right,
          },
        ]}
      />

      {/* Top brand row */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={[styles.brandDot, { backgroundColor: theme.accent }]} />
          <Text style={styles.brandText}>SBALT</Text>
        </View>
        <Text style={styles.tagText}>個人紀錄</Text>
      </View>

      {/* Hero */}
      <View style={styles.heroBlock}>
        <Text style={[styles.heroValue, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {hero.value}
        </Text>
        <Text style={styles.heroLabel}>{hero.label}</Text>
      </View>

      {/* Secondary stats */}
      <View style={styles.secondaryRow}>
        {secondary.map((s, i) => (
          <View key={i} style={styles.secondaryCell}>
            <Text style={styles.secondaryValue}>{s.value}</Text>
            <Text style={styles.secondaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Bottom info */}
      <View style={styles.bottomBlock}>
        <View style={[styles.divider, { backgroundColor: theme.accent + '50' }]} />
        <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.metaLine} numberOfLines={1}>
          {formatDate(checkIn.played_at)}
        </Text>
        {checkIn.location && (
          <Text style={styles.metaLine} numberOfLines={1}>
            {checkIn.location}
          </Text>
        )}
        <View style={styles.bottomTagRow}>
          <View style={[styles.sportPill, { borderColor: theme.accent + '70', backgroundColor: theme.accent + '15' }]}>
            <Text style={[styles.sportPillText, { color: theme.accentSoft }]}>
              {theme.label}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

CheckInShareCard.displayName = 'CheckInShareCard';

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 36,
    backgroundColor: '#0F0F12',
  },
  watermark: {
    position: 'absolute',
    top: CARD_HEIGHT * 0.32,
    left: -20,
    right: -20,
    fontSize: 96,
    fontWeight: '900',
    letterSpacing: -2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  glow: {
    position: 'absolute',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagText: {
    color: '#8B8B92',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  heroBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  heroValue: {
    fontSize: 180,
    fontWeight: '900',
    letterSpacing: -8,
    lineHeight: 180,
    includeFontPadding: false,
  },
  heroLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 4,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 24,
    paddingVertical: 20,
  },
  secondaryCell: {
    alignItems: 'flex-start',
    gap: 4,
  },
  secondaryValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  secondaryLabel: {
    color: '#8B8B92',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  bottomBlock: {
    gap: 4,
  },
  divider: {
    height: 1,
    width: 48,
    marginBottom: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metaLine: {
    color: '#8B8B92',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomTagRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  sportPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  sportPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
