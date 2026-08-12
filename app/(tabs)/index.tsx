import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useTasks } from "@/lib/tasks-context";
import { useGoals } from "@/lib/goals-context";
import { useTimeBlocks } from "@/lib/timeblocks-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const QUOTES = [
  "Focus is the new superpower.",
  "Small daily improvements lead to stunning results.",
  "The secret of getting ahead is getting started.",
  "Don't count the days, make the days count.",
  "What you do every day matters more than what you do once in a while.",
  "Progress, not perfection.",
];

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

function StatCard({
  icon,
  iconColor,
  label,
  value,
  subtitle,
  onPress,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string | number;
  subtitle?: string;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <IconSymbol name={icon as any} size={18} color={iconColor} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, marginLeft: 6 }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground }}>{value}</Text>
      {subtitle && (
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{subtitle}</Text>
      )}
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { getTodayCount, getPendingCount, tasks } = useTasks();
  const { goals } = useGoals();
  const { getBlocksForDate } = useTimeBlocks();

  const today = new Date().toISOString().split("T")[0];
  const todayCount = getTodayCount();
  const pendingCount = getPendingCount();
  const todayBlocks = getBlocksForDate(today);
  const completedGoals = goals.filter((g) => g.progress === 100).length;
  const activeGoals = goals.length - completedGoals;

  const quote = getRandomQuote();

  const completedToday = tasks.filter(
    (t) => t.completed && t.dueDate === today
  ).length;

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
        {/* Greeting */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground }}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* Motivational Quote */}
        <View
          style={{
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.primary,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 15, color: "#FFFFFF", lineHeight: 22, fontWeight: "500" }}>
            "{quote}"
          </Text>
        </View>

        {/* Stats Grid */}
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
          Today
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <StatCard
            icon="list.bullet"
            iconColor="#6C5CE7"
            label="Tasks"
            value={todayCount}
            subtitle={`${completedToday} done`}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/tasks");
            }}
          />
          <StatCard
            icon="clock"
            iconColor="#00B894"
            label="Blocks"
            value={todayBlocks.length}
            subtitle="planned"
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/plan");
            }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          <StatCard
            icon="flag"
            iconColor="#E17055"
            label="Active Goals"
            value={activeGoals}
            subtitle={`${completedGoals} completed`}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/goals");
            }}
          />
          <StatCard
            icon="target"
            iconColor="#0984E3"
            label="Pending"
            value={pendingCount}
            subtitle="total"
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/tasks");
            }}
          />
        </View>

        {/* Quick Actions */}
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
          Quick Actions
        </Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/tasks");
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#6C5CE7",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <IconSymbol name="plus.circle.fill" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                Add a Task
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                Capture what needs to get done
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>

          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/mentor");
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              padding: 16,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#00B894",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <IconSymbol name="target" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                Talk to Mentor
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                Get career guidance and direction
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Today's Time Blocks Preview */}
        {todayBlocks.length > 0 && (
          <>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
              Today's Schedule
            </Text>
            <View style={{ gap: 8 }}>
              {todayBlocks.slice(0, 3).map((block) => (
                <View
                  key={block.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderLeftWidth: 3,
                    borderLeftColor: block.color,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.muted, width: 80 }}>
                    {block.startTime}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: colors.foreground,
                      flex: 1,
                    }}
                  >
                    {block.title}
                  </Text>
                </View>
              ))}
              {todayBlocks.length > 3 && (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web")
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/plan");
                  }}
                  style={({ pressed }) => ({
                    padding: 10,
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                    View all {todayBlocks.length} blocks
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* Footer Credit */}
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            Created by Jainam
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
