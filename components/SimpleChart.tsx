import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

interface ChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

export function LineChart({ data, height = 160 }: ChartProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const paddingTop = 20;
  const paddingBottom = 24;
  const chartH = height - paddingTop - paddingBottom;
  const stepX = data.length > 1 ? 280 / (data.length - 1) : 280;
  const chartWidth = data.length > 1 ? (data.length - 1) * stepX + 40 : 320;

  // Build path
  const points = data.map((d, i) => {
    const x = 20 + i * stepX;
    const y = paddingTop + chartH - (d.value / maxValue) * chartH;
    return { x, y, value: d.value };
  });

  let linePath = '';
  points.forEach((p, i) => {
    linePath += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
  });

  // Fill path (area under line)
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`;

  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height }]}>
        <Svg width={chartWidth} height={height}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartH - ratio * chartH;
            return (
              <Line
                key={i}
                x1={20}
                y1={y}
                x2={chartWidth - 20}
                y2={y}
                stroke={colors.border}
                strokeWidth={0.5}
                strokeDasharray={ratio > 0 && ratio < 1 ? '4,4' : undefined}
              />
            );
          })}

          {/* Area fill */}
          <Path d={fillPath} fill={colors.primary + '15'} />

          {/* Line */}
          <Path
            d={linePath}
            stroke={colors.primary}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {points.map((p, i) => (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r={4} fill={colors.background} stroke={colors.primary} strokeWidth={2} />
              {p.value > 0 && (
                <React.Fragment>
                  <Rect x={p.x - 14} y={p.y - 20} width={28} height={14} rx={3} fill={colors.primary} />
                </React.Fragment>
              )}
            </React.Fragment>
          ))}
        </Svg>

        {/* Value labels on dots */}
        {points.map((p, i) => (
          p.value > 0 ? (
            <Text
              key={`val-${i}`}
              style={[styles.dotValue, { left: p.x - 14, top: p.y - 19, width: 28 }]}
            >
              {p.value % 1 === 0 ? p.value : p.value.toFixed(1)}
            </Text>
          ) : null
        ))}

        {/* X labels */}
        <View style={[styles.labels, { width: chartWidth }]}>
          {data.map((item, i) => (
            <Text
              key={i}
              style={[
                styles.label,
                { color: colors.textSecondary, position: 'absolute', left: 20 + i * stepX - 15, width: 30 },
              ]}
            >
              {item.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  chartArea: {
    position: 'relative',
    width: '100%',
  },
  labels: {
    position: 'absolute',
    bottom: 0,
    height: 20,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
  },
  dotValue: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
});
