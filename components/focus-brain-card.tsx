import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { FocusBrainNetwork } from "@/components/focus-brain-network";
import { useFocusBrain } from "@/lib/focus-brain-context";

export function FocusBrainCard() {
  const router = useRouter();
  const { recommendedTask, model, accuracy, resetLearning } = useFocusBrain();
  const predictionPercent = recommendedTask ? Math.round(recommendedTask.prediction.score * 100) : 0;
  const confidencePercent = Math.round((recommendedTask?.prediction.confidence ?? 0) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={styles.iconWrap}>
            <IconSymbol name="target" size={19} color="#D6D0FF" />
          </View>
          <View>
            <Text style={styles.kicker}>ADAPTIVE LAYER</Text>
            <Text style={styles.title}>Focus Brain</Text>
          </View>
        </View>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>LEARNING</Text>
        </View>
      </View>

      <Text style={styles.description}>
        A private, on-device neural network learns from your task outcomes and finds the best next step.
      </Text>

      <FocusBrainNetwork model={model} prediction={recommendedTask?.prediction ?? null} />

      {recommendedTask ? (
        <Pressable
          onPress={() => router.push("/(tabs)/tasks")}
          style={({ pressed }) => [styles.recommendation, pressed && styles.pressed]}
        >
          <View style={styles.recommendationTopline}>
            <Text style={styles.recommendationLabel}>NEXT FOCUS SIGNAL</Text>
            <Text style={styles.score}>{predictionPercent}% fit</Text>
          </View>
          <Text numberOfLines={2} style={styles.taskTitle}>{recommendedTask.task.title}</Text>
          <View style={styles.reasonRow}>
            {recommendedTask.prediction.reasons.slice(0, 3).map((reason) => (
              <View key={reason} style={styles.reasonPill}>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push("/(tabs)/tasks")}
          style={({ pressed }) => [styles.emptyState, pressed && styles.pressed]}
        >
          <Text style={styles.emptyTitle}>Give it a signal</Text>
          <Text style={styles.emptyCopy}>Add a task and the brain will start ranking your next move.</Text>
        </Pressable>
      )}

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{model.observations}</Text>
          <Text style={styles.statLabel}>outcomes learned</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{accuracy === null ? "—" : `${accuracy}%`}</Text>
          <Text style={styles.statLabel}>signal accuracy</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{recommendedTask ? `${confidencePercent}%` : "—"}</Text>
          <Text style={styles.statLabel}>confidence</Text>
        </View>
        <Pressable onPress={resetLearning} style={({ pressed }) => [styles.reset, pressed && styles.pressed]}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#111D31", borderColor: "#364B76", borderRadius: 0, borderWidth: 1, padding: 20 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  identity: { alignItems: "center", flexDirection: "row", gap: 11 },
  iconWrap: { alignItems: "center", backgroundColor: "#2C2860", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  kicker: { color: "#A79CFF", fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 4 },
  title: { color: "#F8FAFC", fontSize: 20, fontWeight: "800" },
  statusPill: { alignItems: "center", backgroundColor: "#173D3A", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 9, paddingVertical: 6 },
  statusDot: { backgroundColor: "#38D9A9", borderRadius: 999, height: 6, width: 6 },
  statusText: { color: "#8FF0D1", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  description: { color: "#A9B8CC", fontSize: 13, lineHeight: 20, marginTop: 16, maxWidth: 600 },
  recommendation: { backgroundColor: "#182844", borderColor: "#405A8C", borderRadius: 12, borderWidth: 1, marginTop: 17, padding: 15 },
  recommendationTopline: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  recommendationLabel: { color: "#8FA6CB", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  score: { color: "#74E7C6", fontSize: 12, fontWeight: "800" },
  taskTitle: { color: "#F8FAFC", fontSize: 17, fontWeight: "800", lineHeight: 23, marginTop: 9 },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  reasonPill: { backgroundColor: "#263B60", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  reasonText: { color: "#C2D1E8", fontSize: 10, fontWeight: "700" },
  emptyState: { backgroundColor: "#182844", borderColor: "#405A8C", borderRadius: 12, borderWidth: 1, marginTop: 17, padding: 17 },
  emptyTitle: { color: "#F8FAFC", fontSize: 16, fontWeight: "800" },
  emptyCopy: { color: "#A9B8CC", fontSize: 12, lineHeight: 18, marginTop: 5 },
  footer: { alignItems: "center", borderTopColor: "#263A5D", borderTopWidth: 1, flexDirection: "row", gap: 18, marginTop: 17, paddingTop: 15 },
  stat: { minWidth: 82 },
  statValue: { color: "#F8FAFC", fontSize: 17, fontWeight: "800" },
  statLabel: { color: "#8195B3", fontSize: 10, lineHeight: 14, marginTop: 3 },
  reset: { marginLeft: "auto", padding: 5 },
  resetText: { color: "#8D83D9", fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
