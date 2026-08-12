import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

type AnalyticsPieChartProps = {
  data: PieSlice[];
  selectedLabel: string | null;
  onSelect: (label: string) => void;
  compact?: boolean;
};

type Point = { x: number; y: number };

function polarToCartesian(centerX: number, centerY: number, radius: number, angle: number): Point {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

function describeSlice(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export function AnalyticsPieChart({
  data,
  selectedLabel,
  onSelect,
  compact = false,
}: AnalyticsPieChartProps) {
  const total = useMemo(() => data.reduce((sum, slice) => sum + slice.value, 0), [data]);
  const chartSize = compact ? 184 : 220;
  const center = chartSize / 2;
  const radius = compact ? 78 : 94;

  if (total === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyCircle}>
          <Text style={styles.emptyCircleText}>0</Text>
        </View>
        <Text style={styles.emptyTitle}>No focus activity yet</Text>
        <Text style={styles.emptyCopy}>
          Add tasks with categories to reveal your work mix.
        </Text>
      </View>
    );
  }

  let cursor = 0;

  return (
    <View style={styles.chartWrap}>
      <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`} accessibilityLabel="Task category distribution pie chart">
        {data.map((slice) => {
          const sweep = (slice.value / total) * 360;
          const inset = data.length === 1 ? 0 : 1.25;
          const start = cursor + inset;
          const end = cursor + sweep - inset;
          const isSelected = selectedLabel === slice.label;
          const currentRadius = isSelected ? radius + 5 : radius;
          const path = describeSlice(center, center, currentRadius, start, end);
          cursor += sweep;

          if (sweep >= 359.9) {
            return (
              <Circle
                key={slice.label}
                cx={center}
                cy={center}
                r={currentRadius}
                fill={slice.color}
                stroke="#0B1220"
                strokeWidth={isSelected ? 4 : 2}
                onPress={() => onSelect(slice.label)}
                accessibilityLabel={`${slice.label}: ${slice.value} tasks`}
              />
            );
          }

          return (
            <Path
              key={slice.label}
              d={path}
              fill={slice.color}
              stroke="#0B1220"
              strokeWidth={isSelected ? 4 : 2}
              onPress={() => onSelect(slice.label)}
              accessibilityLabel={`${slice.label}: ${slice.value} tasks`}
            />
          );
        })}
      </Svg>

      <View style={styles.legend}>
        {data.map((slice) => {
          const percentage = Math.round((slice.value / total) * 100);
          const isSelected = selectedLabel === slice.label;

          return (
            <Pressable
              key={slice.label}
              onPress={() => onSelect(slice.label)}
              style={({ pressed }) => [
                styles.legendRow,
                isSelected && styles.legendRowSelected,
                pressed && styles.pressed,
              ]}
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Select ${slice.label}, ${percentage} percent`}
            >
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <Text numberOfLines={1} style={styles.legendLabel}>{slice.label}</Text>
              <Text style={styles.legendValue}>{percentage}%</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  legend: {
    gap: 6,
    width: "100%",
  },
  legendRow: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 34,
    paddingHorizontal: 8,
  },
  legendRowSelected: {
    backgroundColor: "rgba(108, 92, 231, 0.12)",
    borderColor: "rgba(160, 150, 255, 0.28)",
  },
  legendDot: {
    borderRadius: 999,
    height: 9,
    marginRight: 8,
    width: 9,
  },
  legendLabel: {
    color: "#CBD5E1",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  legendValue: {
    color: "#F8FAFC",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
  },
  emptyState: {
    alignItems: "center",
    gap: 9,
    justifyContent: "center",
    minHeight: 246,
    paddingHorizontal: 28,
    width: "100%",
  },
  emptyCircle: {
    alignItems: "center",
    backgroundColor: "#182238",
    borderColor: "#2D3A54",
    borderRadius: 999,
    borderWidth: 1,
    height: 128,
    justifyContent: "center",
    width: 128,
  },
  emptyCircleText: {
    color: "#64748B",
    fontSize: 34,
    fontWeight: "800",
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyCopy: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
