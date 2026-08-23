import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";

import {
  FOCUS_BRAIN_FEATURES,
  type FocusBrainModel,
  type FocusBrainPrediction,
} from "@/lib/focus-brain";

const INPUT_LABELS = ["Urgency", "Priority", "Momentum", "Age", "Schedule", "Workload"];
const INPUT_COLORS = ["#B7AEFF", "#A79CFF", "#8E82FF", "#6F9DFF", "#55B6FF", "#38D9A9"];
const HIDDEN_PATTERNS = [
  [1, 0.7, 0.2, 0.1, 0.5, -0.2],
  [0.3, 1, 0.8, 0.1, 0.2, -0.1],
  [0.2, 0.4, 1, 0.6, 0.5, -0.3],
  [0.1, 0.2, 0.4, 1, 0.8, -0.5],
];

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

export function FocusBrainNetwork({
  model,
  prediction,
}: {
  model: FocusBrainModel;
  prediction: FocusBrainPrediction | null;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const features = useMemo(
    () => prediction?.features ?? [0.35, 0.35, 0.5, 0.25, 0.18, 0.25],
    [prediction],
  );
  const weights = useMemo(
    () => model.weights.length === FOCUS_BRAIN_FEATURES.length ? model.weights : [0.82, 0.58, 0.42, -0.18, 0.46, -0.3],
    [model.weights],
  );
  const hiddenActivations = useMemo(
    () => HIDDEN_PATTERNS.map((pattern) => {
      const activation = pattern.reduce((sum, multiplier, index) => sum + features[index] * weights[index] * multiplier, 0);
      return clamp(sigmoid(activation));
    }),
    [features, weights],
  );
  const outputActivation = prediction?.score ?? clamp(sigmoid(model.bias));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const inputNodes = INPUT_LABELS.map((label, index) => ({ label, value: features[index] ?? 0, x: 74, y: 24 + index * 33 }));
  const hiddenNodes = hiddenActivations.map((value, index) => ({ value, x: 178, y: 36 + index * 44 }));
  const outputNode = { value: outputActivation, x: 276, y: 108 };

  return (
    <View style={styles.wrapper}>
      <View style={styles.diagramRow}>
        <Svg width={310} height={228} viewBox="0 0 310 228">
          {inputNodes.flatMap((input, inputIndex) =>
            hiddenNodes.map((hidden, hiddenIndex) => {
              const strength = clamp((input.value * Math.abs(weights[inputIndex]) * (HIDDEN_PATTERNS[hiddenIndex][inputIndex] + 0.35)) / 1.25);
              return (
                <Line
                  key={`input-${inputIndex}-hidden-${hiddenIndex}`}
                  x1={input.x + 9}
                  y1={input.y}
                  x2={hidden.x - 9}
                  y2={hidden.y}
                  stroke={strength > 0.45 ? INPUT_COLORS[inputIndex] : "#33486D"}
                  strokeOpacity={0.18 + strength * 0.7}
                  strokeWidth={0.8 + strength * 1.7}
                />
              );
            }),
          )}
          {hiddenNodes.map((hidden, hiddenIndex) => {
            const strength = hidden.value * (0.3 + Math.abs(weights[hiddenIndex % weights.length]));
            return (
              <Line
                key={`hidden-output-${hiddenIndex}`}
                x1={hidden.x + 9}
                y1={hidden.y}
                x2={outputNode.x - 12}
                y2={outputNode.y}
                stroke={strength > 0.4 ? "#38D9A9" : "#355477"}
                strokeOpacity={0.24 + clamp(strength) * 0.68}
                strokeWidth={1 + clamp(strength) * 2}
              />
            );
          })}

          {inputNodes.map((node, index) => (
            <g key={node.label}>
              <Circle cx={node.x} cy={node.y} r={7 + node.value * 3} fill="#141E37" stroke={INPUT_COLORS[index]} strokeWidth={1.8} />
              <Circle cx={node.x} cy={node.y} r={2 + node.value * 2} fill={INPUT_COLORS[index]} opacity={0.9} />
              <SvgText x={8} y={node.y + 4} fill="#A9B8CC" fontSize="10" fontWeight="600">{node.label}</SvgText>
            </g>
          ))}

          {hiddenNodes.map((node, index) => (
            <g key={`hidden-${index}`}>
              <Circle cx={node.x} cy={node.y} r={8 + node.value * 3} fill="#13283A" stroke="#55B6FF" strokeWidth={1.8} />
              <Circle cx={node.x} cy={node.y} r={2 + node.value * 2} fill="#55B6FF" opacity={0.9} />
            </g>
          ))}

          <Circle cx={outputNode.x} cy={outputNode.y} r={17} fill="#113B38" stroke="#74E7C6" strokeWidth={2.2} />
          <Circle cx={outputNode.x} cy={outputNode.y} r={5 + outputNode.value * 6} fill="#38D9A9" opacity={0.92} />
          <SvgText x={289} y={outputNode.y - 2} fill="#E1FFF5" fontSize="10" fontWeight="700">NEXT</SvgText>
          <SvgText x={289} y={outputNode.y + 11} fill="#8FF0D1" fontSize="10" fontWeight="700">FOCUS</SvgText>
        </Svg>
        <Animated.View style={[styles.pulseHalo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.42] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] }) }] }]} />
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendLine, styles.strongLine]} /><Text style={styles.legendText}>stronger influence</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendLine, styles.weakLine]} /><Text style={styles.legendText}>weaker influence</Text></View>
        <Text style={styles.liveText}>LIVE WEIGHTS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: "#0D1729", borderColor: "#243B60", borderRadius: 12, borderWidth: 1, marginTop: 17, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 12 },
  diagramRow: { alignItems: "center", height: 228, justifyContent: "center", position: "relative" },
  pulseHalo: { backgroundColor: "#38D9A9", borderRadius: 26, height: 52, position: "absolute", right: 13, top: 82, width: 52, zIndex: -1 },
  legend: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 3 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 5 },
  legendLine: { borderRadius: 999, height: 3, width: 20 },
  strongLine: { backgroundColor: "#A79CFF" },
  weakLine: { backgroundColor: "#33486D" },
  legendText: { color: "#8195B3", fontSize: 10 },
  liveText: { color: "#5ED4B1", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
});
