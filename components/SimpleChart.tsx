import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

interface BarChartProps {
  data: { label: string; value: number }[];
  unit?: string;
  height?: number;
}

export function BarChart({ data, unit = '', height = 160 }: BarChartProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(32, (300 - data.length * 4) / data.length);
  const chartWidth = data.length * (barWidth + 8);

  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height }]}>
        <Svg width={chartWidth} height={height}>
          {data.map((item, i) => {
            const barHeight = (item.value / maxValue) * (height - 30);
            const x = i * (barWidth + 8) + 4;
            const y = height - 20 - barHeight;

            return (
              <React.Fragment key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={item.value > 0 ? colors.primary : colors.disabled}
                  opacity={item.value > 0 ? 1 : 0.3}
                />
              </React.Fragment>
            );
          })}
          {/* Baseline */}
          <Line
            x1={0}
            y1={height - 20}
            x2={chartWidth}
            y2={height - 20}
            stroke={colors.border}
            strokeWidth={1}
          />
        </Svg>
        {/* Labels */}
        <View style={[styles.labels, { width: chartWidth }]}>
          {data.map((item, i) => (
            <Text
              key={i}
              style={[styles.label, { color: colors.textSecondary, width: barWidth + 8 }]}
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
  },
  chartArea: {
    position: 'relative',
  },
  labels: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
  },
});
