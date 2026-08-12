import { useState, useCallback } from "react";
import {
  Text,
  View,
  FlatList,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useGoals } from "@/lib/goals-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { Goal, Milestone } from "@/lib/types";
import { Platform as RNPlatform } from "react-native";
import * as Haptics from "expo-haptics";

const GOAL_COLORS = ["#6C5CE7", "#00B894", "#E17055", "#0984E3", "#FDCB6E", "#FF7675"];

function GoalCard({
  goal,
  onToggleMilestone,
  onDelete,
  onAddMilestone,
  onEdit,
}: {
  goal: Goal;
  onToggleMilestone: (milestoneId: string) => void;
  onDelete: () => void;
  onAddMilestone: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();
  const [showMilestones, setShowMilestones] = useState(false);

  return (
    <View
      style={{
        marginBottom: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      {/* Goal Header */}
      <Pressable
        style={({ pressed }) => ({
          padding: 16,
          opacity: pressed ? 0.9 : 1,
        })}
        onLongPress={() => {
          if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert("Goal", "Delete this goal?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: onDelete },
          ]);
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground, lineHeight: 24 }}>
              {goal.title}
            </Text>
            {goal.description && (
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 }}>
                {goal.description}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
          >
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Progress Bar */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length} milestones
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: goal.color }}>
              {goal.progress}%
            </Text>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.border,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: goal.color,
                width: `${goal.progress}%`,
              }}
            />
          </View>
        </View>

        {/* Target Date */}
        {goal.targetDate && (
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
            Target: {new Date(goal.targetDate).toLocaleDateString()}
          </Text>
        )}

        {/* Toggle Milestones */}
        {goal.milestones.length > 0 && (
          <Pressable
            onPress={() => setShowMilestones(!showMilestones)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: goal.color }}>
              {showMilestones ? "Hide" : "Show"} Milestones
            </Text>
            <IconSymbol
              name="chevron.right"
              size={14}
              color={goal.color}
              style={{ transform: [{ rotate: showMilestones ? "90deg" : "0deg" }] }}
            />
          </Pressable>
        )}
      </Pressable>

      {/* Milestones List */}
      {showMilestones && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          {goal.milestones.map((m) => (
            <Pressable
              key={m.id}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                opacity: pressed ? 0.7 : 1,
              })}
              onPress={() => onToggleMilestone(m.id)}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 2,
                  borderColor: m.completed ? "#00B894" : colors.border,
                  backgroundColor: m.completed ? "#00B894" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {m.completed && (
                  <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "bold" }}>
                    &#10003;
                  </Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: m.completed ? colors.muted : colors.foreground,
                  textDecorationLine: m.completed ? "line-through" : "none",
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                {m.title}
              </Text>
            </Pressable>
          ))}

          {/* Add Milestone */}
          <Pressable
            onPress={onAddMilestone}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              marginTop: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: colors.muted,
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.muted }}>+</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.muted }}>Add milestone</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function GoalsScreen() {
  const colors = useColors();
  const { goals, addGoal, deleteGoal, addMilestone, toggleMilestone, deleteGoal: delGoal } = useGoals();
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);
  const [milestoneInput, setMilestoneInput] = useState("");
  const [goalToAddMilestone, setGoalToAddMilestone] = useState<string | null>(null);

  const handleAddGoal = useCallback(() => {
    if (!title.trim()) return;
    addGoal({
      title: title.trim(),
      description: description.trim() || undefined,
      targetDate: targetDate || undefined,
      milestones: [],
      color: selectedColor,
    });
    if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    setModalVisible(false);
  }, [title, description, targetDate, selectedColor, addGoal]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetDate("");
    setSelectedColor(GOAL_COLORS[0]);
  };

  const handleAddMilestone = useCallback(() => {
    if (!milestoneInput.trim() || !goalToAddMilestone) return;
    addMilestone(goalToAddMilestone, milestoneInput.trim());
    setMilestoneInput("");
    setGoalToAddMilestone(null);
    if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [milestoneInput, goalToAddMilestone, addMilestone]);

  return (
    <ScreenContainer className="px-4 pt-2">
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground }}>
            Goals
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

        {/* Goals List */}
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GoalCard
              goal={item}
              onToggleMilestone={(milestoneId) => toggleMilestone(item.id, milestoneId)}
              onDelete={() => delGoal(item.id)}
              onAddMilestone={() => setGoalToAddMilestone(item.id)}
              onEdit={() => {}}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <IconSymbol name="flag" size={48} color={colors.muted} />
              <Text style={{ fontSize: 16, color: colors.muted, marginTop: 12 }}>
                No goals yet
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
                Set a goal and track your progress
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        {/* Add Goal Modal */}
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
                  New Goal
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
                  placeholder="Goal title"
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

                <TextInput
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.muted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  style={{
                    fontSize: 15,
                    color: colors.foreground,
                    minHeight: 60,
                    textAlignVertical: "top",
                    padding: 12,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />

                <TextInput
                  placeholder="Target date (YYYY-MM-DD, optional)"
                  placeholderTextColor={colors.muted}
                  value={targetDate}
                  onChangeText={setTargetDate}
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

                {/* Color */}
                <View>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>COLOR</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {GOAL_COLORS.map((c) => (
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

                <Pressable
                  onPress={handleAddGoal}
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
                    Create Goal
                  </Text>
                </Pressable>
              </View>
            </ScreenContainer>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Milestone Modal */}
        <Modal
          visible={goalToAddMilestone !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setGoalToAddMilestone(null)}
        >
          <Pressable
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: 20,
            }}
            onPress={() => setGoalToAddMilestone(null)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 20,
                width: "90%",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
                Add Milestone
              </Text>
              <TextInput
                placeholder="Milestone title"
                placeholderTextColor={colors.muted}
                value={milestoneInput}
                onChangeText={setMilestoneInput}
                style={{
                  fontSize: 15,
                  color: colors.foreground,
                  padding: 12,
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 16,
                }}
                returnKeyType="done"
                onSubmitEditing={handleAddMilestone}
              />
              <Pressable
                onPress={handleAddMilestone}
                disabled={!milestoneInput.trim()}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  opacity: pressed ? 0.85 : milestoneInput.trim() ? 1 : 0.5,
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>
                  Add Milestone
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ScreenContainer>
  );
}
