import { useState, useCallback, useMemo } from "react";
import {
  Text,
  View,
  FlatList,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useTimeBlocks } from "@/lib/timeblocks-context";
import { useTasks } from "@/lib/tasks-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { TimeBlock } from "@/lib/types";
import { Platform as RNPlatform } from "react-native";
import * as Haptics from "expo-haptics";

const BLOCK_COLORS = [
  "#6C5CE7",
  "#00B894",
  "#E17055",
  "#FDCB6E",
  "#0984E3",
  "#A29BFE",
  "#FF7675",
  "#55EFC4",
];

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function TimeBlockItem({
  block,
  onToggle,
  onDelete,
  onEdit,
}: {
  block: TimeBlock;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => ({
        padding: 14,
        marginBottom: 8,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: block.color,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : block.completed ? 0.5 : 1,
      })}
      onLongPress={() => {
        if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("Time Block", "Delete this time block?", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: onDelete },
        ]);
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => ({
            width: 22,
            height: 22,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: block.completed ? "#00B894" : colors.border,
            backgroundColor: block.completed ? "#00B894" : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {block.completed && (
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}>&#10003;</Text>
          )}
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.foreground,
              textDecorationLine: block.completed ? "line-through" : "none",
              lineHeight: 22,
            }}
          >
            {block.title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            {formatTime(block.startTime)} — {formatTime(block.endTime)}
          </Text>
        </View>

        <Pressable
          onPress={onEdit}
          style={({ pressed }) => ({
            padding: 6,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <IconSymbol name="chevron.right" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function PlanScreen() {
  const colors = useColors();
  const { timeBlocks, addBlock, updateBlock, deleteBlock, toggleBlock, getBlocksForDate } =
    useTimeBlocks();
  const { tasks } = useTasks();
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [selectedColor, setSelectedColor] = useState(BLOCK_COLORS[0]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);

  const blocksForDate = useMemo(
    () => getBlocksForDate(selectedDate),
    [getBlocksForDate, selectedDate]
  );

  const handleAddBlock = useCallback(() => {
    if (!title.trim()) return;
    addBlock({
      title: title.trim(),
      startTime,
      endTime,
      date: selectedDate,
      color: selectedColor,
      taskId: selectedTaskId,
    });
    if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setModalVisible(false);
  }, [title, startTime, endTime, selectedDate, selectedColor, selectedTaskId, addBlock]);

  const resetForm = () => {
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
    setSelectedColor(BLOCK_COLORS[0]);
    setSelectedTaskId(undefined);
  };

  const pendingTasks = tasks.filter((t) => !t.completed);

  // Generate hours for the day view
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  return (
    <ScreenContainer className="px-4 pt-2">
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground }}>
            Plan
          </Text>
          <Pressable
            onPress={() => {
              resetForm();
              setModalVisible(true);
              if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <IconSymbol name="plus.circle.fill" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Date Navigation */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Pressable
            onPress={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
            style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: 20, color: colors.foreground }}>&lsaquo;</Text>
          </Pressable>

          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
            {selectedDate === getTodayStr()
              ? "Today"
              : new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
          </Text>

          <Pressable
            onPress={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
            style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: 20, color: colors.foreground }}>&rsaquo;</Text>
          </Pressable>
        </View>

        {/* Time Blocks List */}
        <FlatList
          data={blocksForDate}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TimeBlockItem
              block={item}
              onToggle={() => toggleBlock(item.id)}
              onDelete={() => deleteBlock(item.id)}
              onEdit={() => {
                setTitle(item.title);
                setStartTime(item.startTime);
                setEndTime(item.endTime);
                setSelectedColor(item.color);
                setSelectedTaskId(item.taskId);
                setModalVisible(true);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <IconSymbol name="clock" size={48} color={colors.muted} />
              <Text style={{ fontSize: 16, color: colors.muted, marginTop: 12 }}>
                No time blocks for this day
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
                Plan your day with focused time blocks
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        {/* Add Block Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            <ScreenContainer className="px-4 pt-2" edges={["top", "left", "right"]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
                  New Time Block
                </Text>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={({ pressed }) => ({
                    padding: 8,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ fontSize: 18, color: colors.muted }}>Done</Text>
                </Pressable>
              </View>

              <View style={{ gap: 16 }}>
                <TextInput
                  placeholder="What are you working on?"
                  placeholderTextColor={colors.muted}
                  value={title}
                  onChangeText={setTitle}
                  style={{
                    fontSize: 18,
                    fontWeight: "500",
                    color: colors.foreground,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    paddingBottom: 8,
                  }}
                  returnKeyType="done"
                />

                {/* Time Range */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>START</Text>
                    <TextInput
                      placeholder="HH:MM"
                      placeholderTextColor={colors.muted}
                      value={startTime}
                      onChangeText={setStartTime}
                      style={{
                        fontSize: 15,
                        color: colors.foreground,
                        padding: 12,
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>END</Text>
                    <TextInput
                      placeholder="HH:MM"
                      placeholderTextColor={colors.muted}
                      value={endTime}
                      onChangeText={setEndTime}
                      style={{
                        fontSize: 15,
                        color: colors.foreground,
                        padding: 12,
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    />
                  </View>
                </View>

                {/* Color */}
                <View>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>COLOR</Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {BLOCK_COLORS.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setSelectedColor(c)}
                        style={({ pressed }) => ({
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: c,
                          borderWidth: 2,
                          borderColor: selectedColor === c ? colors.foreground : "transparent",
                          opacity: pressed ? 0.85 : 1,
                        })}
                      />
                    ))}
                  </View>
                </View>

                {/* Link to Task */}
                {pendingTasks.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
                      LINK TO TASK (optional)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable
                          onPress={() => setSelectedTaskId(undefined)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            backgroundColor: !selectedTaskId ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: !selectedTaskId ? colors.primary : colors.border,
                            opacity: pressed ? 0.85 : 1,
                          })}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: !selectedTaskId ? "#FFFFFF" : colors.foreground,
                            }}
                          >
                            None
                          </Text>
                        </Pressable>
                        {pendingTasks.map((task) => (
                          <Pressable
                            key={task.id}
                            onPress={() => setSelectedTaskId(task.id)}
                            style={({ pressed }) => ({
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 16,
                              backgroundColor: selectedTaskId === task.id ? colors.primary : colors.surface,
                              borderWidth: 1,
                              borderColor: selectedTaskId === task.id ? colors.primary : colors.border,
                              opacity: pressed ? 0.85 : 1,
                            })}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: selectedTaskId === task.id ? "#FFFFFF" : colors.foreground,
                              }}
                              numberOfLines={1}
                            >
                              {task.title}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                <Pressable
                  onPress={handleAddBlock}
                  disabled={!title.trim()}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    opacity: pressed ? 0.85 : title.trim() ? 1 : 0.5,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                    Add Time Block
                  </Text>
                </Pressable>
              </View>
            </ScreenContainer>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ScreenContainer>
  );
}
