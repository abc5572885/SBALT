import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

interface Player {
  id: number;
  x: number;
  y: number;
  team: 'A' | 'B' | 'ball';
}

interface TacticalBoardProps {
  sport: 'basketball' | 'volleyball';
  onDragStart?: () => void;
  onDragEnd?: () => void;
  boardRef?: React.RefObject<View>;
}

const PLAYER_SIZE = 30;

// Tactical board uses its own dark-tactical aesthetic regardless of app theme.
const COURT_BG = '#1F2937';
const COURT_LINE = '#FFFFFF';
const TEAM_A = '#3B82F6'; // blue (our team)
const TEAM_B = '#EF4444'; // red (opponent)

const PEN_COLORS = ['#FFFFFF', '#FBBF24', '#EF4444', '#10B981', '#3B82F6', '#000000'];

const BASKETBALL_POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const VOLLEYBALL_POSITIONS = ['S', 'OH', 'MB', 'OP', 'OH', 'L'];

function getArrowHead(pathData: string, color: string): React.ReactNode | null {
  // Extract last two points from path
  const parts = pathData.split(/[ML]\s*/).filter(Boolean);
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1].trim().split(/\s+/).map(Number);
  const prev = parts[parts.length - 2].trim().split(/\s+/).map(Number);

  if (last.length < 2 || prev.length < 2) return null;

  const [x2, y2] = last;
  const [x1, y1] = prev;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLen = 10;
  const arrowAngle = Math.PI / 6;

  const ax1 = x2 - arrowLen * Math.cos(angle - arrowAngle);
  const ay1 = y2 - arrowLen * Math.sin(angle - arrowAngle);
  const ax2 = x2 - arrowLen * Math.cos(angle + arrowAngle);
  const ay2 = y2 - arrowLen * Math.sin(angle + arrowAngle);

  return <Polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />;
}
const screenWidth = Dimensions.get('window').width;
const boardWidth = screenWidth - 32;

function getInitialPlayers(sport: string, isFullCourt: boolean, w: number, h: number): Player[] {
  if (sport === 'basketball') {
    if (isFullCourt) {
      return [
        { id: 99, x: w * 0.5, y: h * 0.5, team: 'ball' as const },
        { id: 1, x: w * 0.5, y: h * 0.35, team: 'A' },
        { id: 2, x: w * 0.2, y: h * 0.4, team: 'A' },
        { id: 3, x: w * 0.8, y: h * 0.4, team: 'A' },
        { id: 4, x: w * 0.3, y: h * 0.25, team: 'A' },
        { id: 5, x: w * 0.7, y: h * 0.25, team: 'A' },
        { id: 6, x: w * 0.5, y: h * 0.65, team: 'B' },
        { id: 7, x: w * 0.2, y: h * 0.6, team: 'B' },
        { id: 8, x: w * 0.8, y: h * 0.6, team: 'B' },
        { id: 9, x: w * 0.3, y: h * 0.75, team: 'B' },
        { id: 10, x: w * 0.7, y: h * 0.75, team: 'B' },
      ];
    }
    return [
      { id: 99, x: w * 0.5, y: h * 0.5, team: 'ball' as const },
      { id: 1, x: w * 0.5, y: h * 0.55, team: 'A' },
      { id: 2, x: w * 0.15, y: h * 0.6, team: 'A' },
      { id: 3, x: w * 0.85, y: h * 0.6, team: 'A' },
      { id: 4, x: w * 0.3, y: h * 0.75, team: 'A' },
      { id: 5, x: w * 0.7, y: h * 0.75, team: 'A' },
      { id: 6, x: w * 0.5, y: h * 0.35, team: 'B' },
      { id: 7, x: w * 0.25, y: h * 0.45, team: 'B' },
      { id: 8, x: w * 0.75, y: h * 0.45, team: 'B' },
      { id: 9, x: w * 0.35, y: h * 0.28, team: 'B' },
      { id: 10, x: w * 0.65, y: h * 0.28, team: 'B' },
    ];
  }
  return [
    { id: 99, x: w * 0.5, y: h * 0.5, team: 'ball' as const },
    { id: 1, x: w * 0.2, y: h * 0.65, team: 'A' },
    { id: 2, x: w * 0.5, y: h * 0.65, team: 'A' },
    { id: 3, x: w * 0.8, y: h * 0.65, team: 'A' },
    { id: 4, x: w * 0.2, y: h * 0.82, team: 'A' },
    { id: 5, x: w * 0.5, y: h * 0.82, team: 'A' },
    { id: 6, x: w * 0.8, y: h * 0.82, team: 'A' },
    { id: 7, x: w * 0.2, y: h * 0.18, team: 'B' },
    { id: 8, x: w * 0.5, y: h * 0.18, team: 'B' },
    { id: 9, x: w * 0.8, y: h * 0.18, team: 'B' },
    { id: 10, x: w * 0.2, y: h * 0.35, team: 'B' },
    { id: 11, x: w * 0.5, y: h * 0.35, team: 'B' },
    { id: 12, x: w * 0.8, y: h * 0.35, team: 'B' },
  ];
}

function BasketballHalfCourt({ w, h }: { w: number; h: number }) {
  const line = COURT_LINE;
  const lw = 1.2;
  const keyW = w * 0.34;
  const keyH = h * 0.4;
  const keyX = (w - keyW) / 2;
  const ftR = keyW / 2;
  const rimY = h * 0.07;
  const threeR = w * 0.44;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Rect x={1} y={1} width={w - 2} height={h - 2} stroke={line} strokeWidth={1.5} fill="none" opacity={0.85} />
      <Rect x={keyX} y={0} width={keyW} height={keyH} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
      <Circle cx={w / 2} cy={keyH} r={ftR} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
      <Circle cx={w / 2} cy={rimY} r={5} stroke={line} strokeWidth={1.5} fill="none" />
      <Line x1={w / 2 - 14} y1={rimY - 5} x2={w / 2 + 14} y2={rimY - 5} stroke={line} strokeWidth={2} />
      <Path d={`M ${w / 2 - threeR} 0 L ${w / 2 - threeR} ${h * 0.1} A ${threeR} ${threeR} 0 0 0 ${w / 2 + threeR} ${h * 0.1} L ${w / 2 + threeR} 0`} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
    </Svg>
  );
}

function BasketballFullCourt({ w, h }: { w: number; h: number }) {
  const line = COURT_LINE;
  const lw = 1.2;
  const keyW = w * 0.34;
  const keyH = h * 0.2;
  const keyX = (w - keyW) / 2;
  const ftR = keyW / 2;
  const threeR = w * 0.44;
  const centerR = w * 0.12;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Rect x={1} y={1} width={w - 2} height={h - 2} stroke={line} strokeWidth={1.5} fill="none" opacity={0.85} />
      <Line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={line} strokeWidth={lw} opacity={0.7} />
      <Circle cx={w / 2} cy={h / 2} r={centerR} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
      {/* Top half */}
      <Rect x={keyX} y={0} width={keyW} height={keyH} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
      <Circle cx={w / 2} cy={keyH} r={ftR} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
      <Circle cx={w / 2} cy={h * 0.035} r={4} stroke={line} strokeWidth={1.2} fill="none" />
      <Path d={`M ${w / 2 - threeR} 0 L ${w / 2 - threeR} ${h * 0.05} A ${threeR} ${threeR} 0 0 0 ${w / 2 + threeR} ${h * 0.05} L ${w / 2 + threeR} 0`} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
      {/* Bottom half */}
      <Rect x={keyX} y={h - keyH} width={keyW} height={keyH} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
      <Circle cx={w / 2} cy={h - keyH} r={ftR} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
      <Circle cx={w / 2} cy={h * 0.965} r={4} stroke={line} strokeWidth={1.2} fill="none" />
      <Path d={`M ${w / 2 - threeR} ${h} L ${w / 2 - threeR} ${h * 0.95} A ${threeR} ${threeR} 0 0 1 ${w / 2 + threeR} ${h * 0.95} L ${w / 2 + threeR} ${h}`} stroke={line} strokeWidth={lw} fill="none" opacity={0.7} />
    </Svg>
  );
}

function VolleyballCourt({ w, h }: { w: number; h: number }) {
  const line = COURT_LINE;
  const lw = 1.2;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Rect x={1} y={1} width={w - 2} height={h - 2} stroke={line} strokeWidth={1.5} fill="none" opacity={0.85} />
      <Line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={line} strokeWidth={2} />
      <Line x1={0} y1={h * 0.33} x2={w} y2={h * 0.33} stroke={line} strokeWidth={lw} strokeDasharray="6,4" opacity={0.55} />
      <Line x1={0} y1={h * 0.67} x2={w} y2={h * 0.67} stroke={line} strokeWidth={lw} strokeDasharray="6,4" opacity={0.55} />
    </Svg>
  );
}

function DraggablePlayer({
  player,
  onMove,
  onDragStart,
  onDragEnd,
  teamAColor,
  teamBColor,
  boardW,
  boardH,
  sport,
}: {
  player: Player;
  onMove: (id: number, x: number, y: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  teamAColor: string;
  teamBColor: string;
  boardW: number;
  boardH: number;
  sport: string;
}) {
  const dragStartPos = useRef({ x: 0, y: 0 });
  const latestPos = useRef({ x: player.x, y: player.y });
  latestPos.current = { x: player.x, y: player.y };

  const panResponder = React.useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartPos.current = { x: latestPos.current.x, y: latestPos.current.y };
        onDragStart();
      },
      onPanResponderMove: (_, gesture) => {
        const newX = Math.max(PLAYER_SIZE / 2, Math.min(boardW - PLAYER_SIZE / 2, dragStartPos.current.x + gesture.dx));
        const newY = Math.max(PLAYER_SIZE / 2, Math.min(boardH - PLAYER_SIZE / 2, dragStartPos.current.y + gesture.dy));
        onMove(player.id, newX, newY);
      },
      onPanResponderRelease: () => {
        onDragEnd();
      },
    }), [player.id, boardW, boardH]);

  const isBall = player.team === 'ball';
  const ballSize = PLAYER_SIZE * 0.8;
  const r = ballSize / 2;

  if (isBall) {
    const isBasketball = sport === 'basketball';
    const ballFill = isBasketball ? '#F97316' : '#FAFAF9';
    const ballSeam = isBasketball ? '#9A3412' : '#78716C';
    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.ball,
          {
            width: ballSize,
            height: ballSize,
            left: player.x - r,
            top: player.y - r,
          },
        ]}
      >
        <Svg width={ballSize} height={ballSize}>
          <Circle cx={r} cy={r} r={r - 1.5} fill={ballFill} stroke="#FFFFFF" strokeWidth={1.5} />
          {isBasketball ? (
            <>
              {/* Vertical seam (meridian) */}
              <Line x1={r} y1={r * 0.25} x2={r} y2={r * 1.75} stroke={ballSeam} strokeWidth={1.1} />
              {/* Left ")" curve — bulges right toward center, endpoints inside orange */}
              <Path
                d={`M ${r * 0.4} ${r * 0.45} Q ${r * 0.95} ${r} ${r * 0.4} ${r * 1.55}`}
                stroke={ballSeam}
                strokeWidth={1.1}
                fill="none"
              />
              {/* Right "(" curve — bulges left toward center, endpoints inside orange */}
              <Path
                d={`M ${r * 1.6} ${r * 0.45} Q ${r * 1.05} ${r} ${r * 1.6} ${r * 1.55}`}
                stroke={ballSeam}
                strokeWidth={1.1}
                fill="none"
              />
            </>
          ) : (
            <>
              {/* Volleyball curved bands (3 panels) */}
              <Path
                d={`M ${r * 0.2} ${r * 0.55} Q ${r} ${r * 1.05} ${r * 1.8} ${r * 0.55}`}
                stroke={ballSeam}
                strokeWidth={1}
                fill="none"
              />
              <Path
                d={`M ${r * 0.2} ${r * 1.45} Q ${r} ${r * 0.95} ${r * 1.8} ${r * 1.45}`}
                stroke={ballSeam}
                strokeWidth={1}
                fill="none"
              />
            </>
          )}
        </Svg>
      </View>
    );
  }

  const positions = sport === 'basketball' ? BASKETBALL_POSITIONS : VOLLEYBALL_POSITIONS;
  const playerIndex = player.team === 'A' ? player.id - 1 : player.id - 6;
  const label = playerIndex >= 0 && playerIndex < positions.length ? positions[playerIndex] : `${player.id}`;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.player,
        {
          backgroundColor: player.team === 'A' ? teamAColor : teamBColor,
          left: player.x - PLAYER_SIZE / 2,
          top: player.y - PLAYER_SIZE / 2,
          borderColor: '#FFFFFF',
          borderWidth: 1.5,
        },
      ]}
    >
      <Text style={styles.playerText}>{label}</Text>
    </View>
  );
}

export function TacticalBoard({ sport, onDragStart, onDragEnd, boardRef }: TacticalBoardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isFullCourt, setIsFullCourt] = useState(false);
  const [drawEnabled, setDrawEnabled] = useState(false);
  const lastTapRef = useRef(0);
  const [penColor, setPenColor] = useState('#FFFFFF');
  const [drawnLines, setDrawnLines] = useState<{ path: string; color: string }[]>([]);
  const [undoneLines, setUndoneLines] = useState<{ path: string; color: string }[]>([]);
  const [currentLine, setCurrentLine] = useState<string>('');

  const h = isFullCourt ? boardWidth * 1.4 : boardWidth * 0.85;
  const [players, setPlayers] = useState<Player[]>(getInitialPlayers(sport, isFullCourt, boardWidth, h));

  const courtColor = COURT_BG;
  const teamAColor = TEAM_A;
  const teamBColor = TEAM_B;

  const handleMove = (id: number, x: number, y: number) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  };

  const handleReset = () => {
    setPlayers(getInitialPlayers(sport, isFullCourt, boardWidth, h));
    setDrawnLines([]);
    setUndoneLines([]);
    setCurrentLine('');
  };

  const toggleCourt = () => {
    const newFull = !isFullCourt;
    const newH = newFull ? boardWidth * 1.4 : boardWidth * 0.85;
    setIsFullCourt(newFull);
    setPlayers(getInitialPlayers(sport, newFull, boardWidth, newH));
  };

  const handleDragStart = () => onDragStart?.();
  const handleDragEnd = () => onDragEnd?.();

  const drawResponder = React.useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => drawEnabled,
      onPanResponderGrant: (evt) => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          // Double tap — toggle mode
          setDrawEnabled((prev) => !prev);
          lastTapRef.current = 0;
          setCurrentLine('');
          return;
        }
        lastTapRef.current = now;

        if (!drawEnabled) return;

        const { locationX, locationY } = evt.nativeEvent;
        setCurrentLine(`M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
        onDragStart?.();
      },
      onPanResponderMove: (evt) => {
        if (!drawEnabled) return;
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentLine((prev) => {
          if (!prev) return ''; // No M yet — guard against orphan L
          return `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        });
      },
      onPanResponderRelease: () => {
        // Only save paths with at least one L (actual movement).
        // Bare "M x y" with no L renders as a visible dot due to strokeLinecap="round".
        if (currentLine && currentLine.startsWith('M') && currentLine.includes(' L ')) {
          setDrawnLines((prev) => [...prev, { path: currentLine, color: penColor }]);
          setUndoneLines([]);
        }
        setCurrentLine('');
        onDragEnd?.();
      },
    }), [drawEnabled, currentLine, penColor]);

  const handleUndo = () => {
    if (drawnLines.length === 0) return;
    const last = drawnLines[drawnLines.length - 1];
    setDrawnLines((prev) => prev.slice(0, -1));
    setUndoneLines((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    if (undoneLines.length === 0) return;
    const last = undoneLines[undoneLines.length - 1];
    setUndoneLines((prev) => prev.slice(0, -1));
    setDrawnLines((prev) => [...prev, last]);
  };

  return (
    <View style={styles.container}>
      {/* Court toggle (basketball only) */}
      {sport === 'basketball' && (
        <View style={[styles.courtSegmented, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.courtSegBtn, !isFullCourt && { backgroundColor: colors.text }]}
            onPress={() => { if (isFullCourt) toggleCourt(); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.courtSegText, { color: !isFullCourt ? colors.background : colors.textSecondary }]}>半場</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.courtSegBtn, isFullCourt && { backgroundColor: colors.text }]}
            onPress={() => { if (!isFullCourt) toggleCourt(); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.courtSegText, { color: isFullCourt ? colors.background : colors.textSecondary }]}>全場</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Board */}
      <View
        ref={boardRef as any}
        style={[styles.board, { backgroundColor: courtColor, width: boardWidth, height: h }]}
        {...drawResponder.panHandlers}
      >
        {sport === 'basketball' ? (
          isFullCourt ? <BasketballFullCourt w={boardWidth} h={h} /> : <BasketballHalfCourt w={boardWidth} h={h} />
        ) : (
          <VolleyballCourt w={boardWidth} h={h} />
        )}

        {/* Drawn lines */}
        <Svg width={boardWidth} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          {drawnLines.map((line, i) => (
            <React.Fragment key={i}>
              <Path d={line.path} stroke={line.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {getArrowHead(line.path, line.color)}
            </React.Fragment>
          ))}
          {currentLine ? (
            <Path d={currentLine} stroke={penColor} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>

        {/* Players */}
        <View style={StyleSheet.absoluteFill} pointerEvents={drawEnabled ? 'none' : 'auto'}>
          {players.map((player) => (
            <DraggablePlayer
              key={player.id}
              player={player}
              onMove={handleMove}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              teamAColor={teamAColor}
              teamBColor={teamBColor}
              boardW={boardWidth}
              boardH={h}
              sport={sport}
            />
          ))}
        </View>
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Mode segmented control */}
        <View style={[styles.segmented, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, !drawEnabled && { backgroundColor: colors.text }]}
            onPress={() => setDrawEnabled(false)}
            activeOpacity={0.7}
          >
            <IconSymbol name="hand.raised.fill" size={15} color={!drawEnabled ? colors.background : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, drawEnabled && { backgroundColor: colors.text }]}
            onPress={() => setDrawEnabled(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="pencil" size={15} color={drawEnabled ? colors.background : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Colors (only when drawing) */}
        {drawEnabled ? (
          <View style={styles.toolGroup}>
            {PEN_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderColor: c === '#FFFFFF' ? colors.border : 'transparent' },
                  penColor === c && { borderWidth: 2.5, borderColor: colors.text },
                ]}
                onPress={() => setPenColor(c)}
                activeOpacity={0.7}
              />
            ))}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Undo / Redo */}
        <View style={styles.toolGroup}>
          <TouchableOpacity style={styles.toolBtn} onPress={handleUndo} activeOpacity={0.6} disabled={drawnLines.length === 0}>
            <IconSymbol name="chevron.left" size={16} color={drawnLines.length > 0 ? colors.text : colors.disabled} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={handleRedo} activeOpacity={0.6} disabled={undoneLines.length === 0}>
            <IconSymbol name="chevron.right" size={16} color={undoneLines.length > 0 ? colors.text : colors.disabled} />
          </TouchableOpacity>
        </View>

        {/* Reset */}
        <TouchableOpacity style={styles.toolBtn} onPress={handleReset} activeOpacity={0.6}>
          <IconSymbol name="arrow.clockwise" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  courtSegmented: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: Radius.sm,
    padding: 2,
    gap: 2,
    marginBottom: Spacing.xs,
  },
  courtSegBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.sm - 2,
    minWidth: 56,
    alignItems: 'center',
  },
  courtSegText: {
    fontSize: 12,
    fontWeight: '600',
  },
  board: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  ball: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 999,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  toolGroup: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  toolBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
});
