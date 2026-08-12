import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AnalyticsPieChart, type PieSlice } from "@/components/analytics-pie-chart";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useGoals } from "@/lib/goals-context";
import { useTasks } from "@/lib/tasks-context";
import { useTimeBlocks } from "@/lib/timeblocks-context";
import type { Task } from "@/lib/types";

type TimeRange = "7d" | "30d" | "all";

const CATEGORY_COLORS = ["#8B7CFF", "#38D9A9", "#FFB86B", "#FF7A9E", "#55B6FF", "#D7A6FF", "#A3E635"];
const RANGES: { id: TimeRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

function startOfRange(range: TimeRange) {
  if (range === "all") return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (range === "7d" ? 6 : 29));
  return date;
}

function isInRange(dateValue: string | undefined, range: TimeRange) {
  const rangeStart = startOfRange(range);
  if (!rangeStart || !dateValue) return true;
  const date = new Date(dateValue.includes("T") ? dateValue : `${dateValue}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date >= rangeStart;
}

function pluralize(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

function formatHour(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHour = hours % 12 || 12;
  return `${normalizedHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function MetricCard({
  eyebrow,
  value,
  caption,
  accent,
}: {
  eyebrow: string;
  value: string;
  caption: string;
  accent: string;
}) {
  return (
    <View style={[styles.metricCard, { borderTopColor: accent }]}>
      <Text style={styles.metricEyebrow}>{eyebrow}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const { timeBlocks } = useTimeBlocks();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<TimeRange>("30d");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isWide = width >= 1080;
  const isMedium = width >= 680 && width < 1080;
  const gridSpan = (wide: number, medium = 12) => {
    if (Platform.OS !== "web") return undefined;
    return `span ${isWide ? wide : isMedium ? medium : 12}`;
  };
  const webGridLayout = Platform.OS === "web"
    ? ({ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 0 } as any)
    : undefined;

  const scopedTasks = useMemo(
    () => tasks.filter((task) => isInRange(task.createdAt, range)),
    [tasks, range]
  );
  const scopedBlocks = useMemo(
    () => timeBlocks.filter((block) => isInRange(block.date, range)),
    [timeBlocks, range]
  );

  const categoryData = useMemo<PieSlice[]>(() => {
    const categoryCounts = scopedTasks.reduce<Record<string, number>>((counts, task) => {
      const category = task.category?.trim() || "Uncategorized";
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});

    return Object.entries(categoryCounts)
      .sort(([, left], [, right]) => right - left)
      .map(([label, value], index) => ({
        label,
        value,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));
  }, [scopedTasks]);

  useEffect(() => {
    if (selectedCategory && !categoryData.some((slice) => slice.label === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [categoryData, selectedCategory]);

  const totalTasks = scopedTasks.length;
  const completedTasks = scopedTasks.filter((task) => task.completed).length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const plannedBlocks = scopedBlocks.length;
  const completedBlocks = scopedBlocks.filter((block) => block.completed).length;
  const activeGoals = goals.filter((goal) => goal.progress < 100).length;
  const averageGoalProgress = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
    : 0;
  const categoryTotal = categoryData.length;
  const selectedSlice = categoryData.find((slice) => slice.label === selectedCategory);
  const displayedTasks = selectedCategory
    ? scopedTasks.filter((task) => (task.category?.trim() || "Uncategorized") === selectedCategory)
    : scopedTasks;
  const selectedCompleted = displayedTasks.filter((task) => task.completed).length;
  const currentScope = range === "7d" ? "the last 7 days" : range === "30d" ? "the last 30 days" : "all recorded time";
  const activityTitle = selectedSlice ? `${selectedSlice.label} focus` : "All scoped tasks";

  const nextBlocks = [...scopedBlocks]
    .filter((block) => !block.completed)
    .sort((left, right) => `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`))
    .slice(0, 4);

  const handleCategorySelect = (label: string) => {
    setSelectedCategory((current) => (current === label ? null : label));
  };

  return (
    <ScreenContainer style={styles.safeArea}>
      <View style={styles.dashboardCanvas}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.dashboardHeader}>
            <View>
              <Text style={styles.kicker}>FOCUS PATH / ANALYTICS</Text>
              <Text style={styles.pageTitle}>Your attention, clearly mapped.</Text>
              <Text style={styles.pageSubhead}>
                A live view of tasks, planning, and goal momentum across {currentScope}.
              </Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>LIVE DATA</Text>
            </View>
          </View>

          <View style={styles.rangeControl} accessibilityRole="tablist">
            {RANGES.map((item) => {
              const active = range === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setRange(item.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.rangeButton,
                    active && styles.rangeButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.rangeButtonLabel, active && styles.rangeButtonLabelActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.webGrid, webGridLayout] as any}>
            <View style={[styles.metricGrid, { gridColumn: gridSpan(12) } as any]}>
              <MetricCard
                eyebrow="TASK COMPLETION"
                value={`${completionRate}%`}
                caption={`${completedTasks} of ${totalTasks} completed`}
                accent="#8B7CFF"
              />
              <MetricCard
                eyebrow="PLANNED BLOCKS"
                value={String(plannedBlocks)}
                caption={`${completedBlocks} marked complete`}
                accent="#38D9A9"
              />
              <MetricCard
                eyebrow="ACTIVE GOALS"
                value={String(activeGoals)}
                caption={goals.length ? `${averageGoalProgress}% average progress` : "Create a goal to track progress"}
                accent="#FFB86B"
              />
              <MetricCard
                eyebrow="FOCUS CATEGORIES"
                value={String(categoryTotal)}
                caption={categoryTotal ? "Across your scoped tasks" : "Categories appear with tasks"}
                accent="#55B6FF"
              />
            </View>

            <View style={[styles.card, styles.chartCard, { gridColumn: gridSpan(7, 7) } as any]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardKicker}>WORKLOAD DISTRIBUTION</Text>
                  <Text style={styles.cardTitle}>Where your focus is going</Text>
                </View>
                <View style={styles.chartChip}>
                  <IconSymbol name="chart.pie" size={17} color="#B7AEFF" />
                  <Text style={styles.chartChipText}>PIE</Text>
                </View>
              </View>
              <Text style={styles.cardCopy}>
                Select a segment or legend label to inspect a category. The distribution is calculated from your actual task categories.
              </Text>
              <AnalyticsPieChart
                data={categoryData}
                selectedLabel={selectedCategory}
                onSelect={handleCategorySelect}
              />
            </View>

            <View style={[styles.card, styles.insightCard, { gridColumn: gridSpan(5, 5) } as any]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardKicker}>FOCUS SIGNAL</Text>
                  <Text style={styles.cardTitle}>{activityTitle}</Text>
                </View>
                {selectedCategory && (
                  <Pressable onPress={() => setSelectedCategory(null)} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.signalValueWrap}>
                <Text style={styles.signalValue}>{displayedTasks.length}</Text>
                <Text style={styles.signalLabel}>tasks in view</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${displayedTasks.length ? Math.round((selectedCompleted / displayedTasks.length) * 100) : 0}%` }]} />
              </View>
              <Text style={styles.insightCopy}>
                {displayedTasks.length
                  ? `${pluralize(selectedCompleted, "task")} completed in ${selectedCategory ?? "this selection"}. Keep your next block aligned with the work that matters most.`
                  : "Select a range with activity, or create tasks with categories to see a tailored focus signal."}
              </Text>
              <View style={styles.miniRule} />
              <Text style={styles.miniLabel}>COMPLETION IN VIEW</Text>
              <Text style={styles.miniValue}>
                {displayedTasks.length ? `${Math.round((selectedCompleted / displayedTasks.length) * 100)}%` : "—"}
              </Text>
            </View>

            <View style={[styles.card, styles.activityCard, { gridColumn: gridSpan(7, 7) } as any]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardKicker}>TASK ACTIVITY</Text>
                  <Text style={styles.cardTitle}>{selectedCategory ? `${selectedCategory} tasks` : "Task pulse"}</Text>
                </View>
                <Text style={styles.cardMeta}>{pluralize(displayedTasks.length, "task")}</Text>
              </View>

              <View style={styles.taskList}>
                {displayedTasks.slice(0, 5).map((task) => (
                  <TaskRow key={task.id} task={task} categoryData={categoryData} />
                ))}
                {!displayedTasks.length && (
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListTitle}>Nothing to show in this view</Text>
                    <Text style={styles.emptyListCopy}>Tasks you add in the selected period will appear here.</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.card, styles.scheduleCard, { gridColumn: gridSpan(5, 5) } as any]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardKicker}>UP NEXT</Text>
                  <Text style={styles.cardTitle}>Planned focus blocks</Text>
                </View>
                <IconSymbol name="clock" size={18} color="#38D9A9" />
              </View>
              <View style={styles.scheduleList}>
                {nextBlocks.map((block) => (
                  <View key={block.id} style={styles.scheduleRow}>
                    <View style={[styles.scheduleMarker, { backgroundColor: block.color || "#38D9A9" }]} />
                    <View style={styles.scheduleText}>
                      <Text numberOfLines={1} style={styles.scheduleTitle}>{block.title}</Text>
                      <Text style={styles.scheduleMeta}>{block.date} · {formatHour(block.startTime)}</Text>
                    </View>
                  </View>
                ))}
                {!nextBlocks.length && (
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListTitle}>Your calendar is clear</Text>
                    <Text style={styles.emptyListCopy}>Add a time block to turn your priorities into protected focus time.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <Text style={styles.footerNote}>Focus Path analytics update automatically as you plan, complete, and organize your work.</Text>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function TaskRow({ task, categoryData }: { task: Task; categoryData: PieSlice[] }) {
  const category = task.category?.trim() || "Uncategorized";
  const color = categoryData.find((slice) => slice.label === category)?.color ?? "#64748B";

  return (
    <View style={styles.taskRow}>
      <View style={[styles.taskStatus, task.completed && styles.taskStatusComplete]}>
        {task.completed && <IconSymbol name="checkmark.circle.fill" size={16} color="#0B1220" />}
      </View>
      <View style={styles.taskText}>
        <Text numberOfLines={1} style={[styles.taskTitle, task.completed && styles.taskTitleComplete]}>{task.title}</Text>
        <View style={styles.taskMetaRow}>
          <View style={[styles.categoryDot, { backgroundColor: color }]} />
          <Text style={styles.taskMeta}>{category}</Text>
          {task.dueDate && <Text style={styles.taskMeta}> · Due {task.dueDate}</Text>}
        </View>
      </View>
      <View style={[styles.priorityPill, task.priority === "high" && styles.priorityHigh, task.priority === "medium" && styles.priorityMedium]}>
        <Text style={styles.priorityText}>{task.priority}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#0B1220" },
  dashboardCanvas: { backgroundColor: "#0B1220", flex: 1, minHeight: "100%" },
  scrollContent: { paddingBottom: 118 },
  dashboardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 22,
  },
  kicker: { color: "#A79CFF", fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 10 },
  pageTitle: { color: "#F8FAFC", fontSize: 29, fontWeight: "800", letterSpacing: -0.7, lineHeight: 36 },
  pageSubhead: { color: "#94A3B8", fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 540 },
  livePill: { alignItems: "center", backgroundColor: "#131E31", borderColor: "#263652", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 7, paddingHorizontal: 11, paddingVertical: 7 },
  liveDot: { backgroundColor: "#38D9A9", borderRadius: 999, height: 7, width: 7 },
  liveLabel: { color: "#BFD0E6", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  rangeControl: { alignSelf: "flex-start", backgroundColor: "#131E31", borderColor: "#263652", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 3, marginBottom: 18, marginLeft: 24, padding: 4 },
  rangeButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  rangeButtonActive: { backgroundColor: "#8B7CFF" },
  rangeButtonLabel: { color: "#93A4BD", fontSize: 12, fontWeight: "700" },
  rangeButtonLabelActive: { color: "#FFFFFF" },
  webGrid: { alignItems: "stretch", flexDirection: "column", gap: 16, width: "100%" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, width: "100%" },
  metricCard: { backgroundColor: "#101B2D", borderColor: "#263652", borderRadius: 0, borderTopWidth: 3, borderWidth: 1, flexGrow: 1, flexBasis: 180, minHeight: 130, padding: 18 },
  metricEyebrow: { color: "#92A4C0", fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  metricValue: { color: "#F8FAFC", fontSize: 34, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: -0.8, marginTop: 15 },
  metricCaption: { color: "#93A4BD", fontSize: 12, lineHeight: 18, marginTop: 4 },
  card: { backgroundColor: "#101B2D", borderColor: "#263652", borderRadius: 0, borderWidth: 1, padding: 20 },
  chartCard: { minHeight: 460 },
  insightCard: { justifyContent: "flex-start", minHeight: 460 },
  activityCard: { minHeight: 360 },
  scheduleCard: { minHeight: 360 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  cardKicker: { color: "#8D83D9", fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 7 },
  cardTitle: { color: "#F8FAFC", fontSize: 19, fontWeight: "800", letterSpacing: -0.35 },
  cardCopy: { color: "#93A4BD", fontSize: 13, lineHeight: 20, marginBottom: 18, marginTop: 10, maxWidth: 560 },
  chartChip: { alignItems: "center", backgroundColor: "#1E2841", borderRadius: 8, flexDirection: "row", gap: 5, paddingHorizontal: 8, paddingVertical: 6 },
  chartChipText: { color: "#B7AEFF", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  resetButton: { backgroundColor: "#1E2841", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  resetButtonText: { color: "#BEC6FF", fontSize: 11, fontWeight: "800" },
  signalValueWrap: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 50 },
  signalValue: { color: "#F8FAFC", fontSize: 65, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: -2.5 },
  signalLabel: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },
  progressTrack: { backgroundColor: "#25334A", borderRadius: 999, height: 9, marginTop: 22, overflow: "hidden", width: "100%" },
  progressFill: { backgroundColor: "#8B7CFF", borderRadius: 999, height: "100%" },
  insightCopy: { color: "#B4C1D3", fontSize: 13, lineHeight: 21, marginTop: 17 },
  miniRule: { backgroundColor: "#263652", height: 1, marginTop: 22, width: "100%" },
  miniLabel: { color: "#71829B", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 15 },
  miniValue: { color: "#38D9A9", fontSize: 22, fontWeight: "800", marginTop: 4 },
  cardMeta: { color: "#93A4BD", fontSize: 12, fontWeight: "700" },
  taskList: { marginTop: 15 },
  taskRow: { alignItems: "center", borderBottomColor: "#22314A", borderBottomWidth: 1, flexDirection: "row", minHeight: 62, paddingVertical: 10 },
  taskStatus: { alignItems: "center", borderColor: "#4D607D", borderRadius: 999, borderWidth: 1.5, height: 18, justifyContent: "center", marginRight: 11, width: 18 },
  taskStatusComplete: { backgroundColor: "#38D9A9", borderColor: "#38D9A9" },
  taskText: { flex: 1, minWidth: 0 },
  taskTitle: { color: "#E6EEF8", fontSize: 14, fontWeight: "700" },
  taskTitleComplete: { color: "#8090A8", textDecorationLine: "line-through" },
  taskMetaRow: { alignItems: "center", flexDirection: "row", marginTop: 5 },
  categoryDot: { borderRadius: 999, height: 6, marginRight: 5, width: 6 },
  taskMeta: { color: "#8293AB", fontSize: 11 },
  priorityPill: { backgroundColor: "#1D2A40", borderRadius: 999, marginLeft: 10, paddingHorizontal: 8, paddingVertical: 4 },
  priorityHigh: { backgroundColor: "rgba(255, 122, 158, 0.18)" },
  priorityMedium: { backgroundColor: "rgba(255, 184, 107, 0.16)" },
  priorityText: { color: "#B7C4D8", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  scheduleList: { marginTop: 18 },
  scheduleRow: { alignItems: "center", borderBottomColor: "#22314A", borderBottomWidth: 1, flexDirection: "row", minHeight: 59, paddingVertical: 9 },
  scheduleMarker: { borderRadius: 999, height: 9, marginRight: 10, width: 9 },
  scheduleText: { flex: 1, minWidth: 0 },
  scheduleTitle: { color: "#E6EEF8", fontSize: 14, fontWeight: "700" },
  scheduleMeta: { color: "#8293AB", fontSize: 11, marginTop: 5 },
  emptyList: { alignItems: "center", justifyContent: "center", minHeight: 180, paddingHorizontal: 20 },
  emptyListTitle: { color: "#E6EEF8", fontSize: 14, fontWeight: "700", textAlign: "center" },
  emptyListCopy: { color: "#8293AB", fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 260, textAlign: "center" },
  footerNote: { color: "#667A96", fontSize: 12, lineHeight: 18, paddingHorizontal: 24, paddingTop: 18 },
  pressed: { opacity: 0.72 },
});
