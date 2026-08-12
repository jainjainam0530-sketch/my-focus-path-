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
import { useTasks } from "@/lib/tasks-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { Task, TaskFilter } from "@/lib/types";
import { Platform as RNPlatform } from "react-native";
import * as Haptics from "expo-haptics";

const TASK_CATEGORIES = ["Work", "Learning", "Health", "Personal"];
const PRIORITIES = ["low", "medium", "high"] as const;

const PRIORITY_COLORS = {
  low: "#00B894",
  medium: "#FDCB6E",
  high: "#E17055",
};

function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          marginBottom: 8,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        task.completed && { opacity: 0.5 },
      ]}
      onLongPress={() => {
        if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("Task Options", "Delete this task?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: onDelete,
          },
        ]);
      }}
      onPress={onToggle}
    >
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: task.completed ? "#00B894" : colors.border,
          backgroundColor: task.completed ? "#00B894" : "transparent",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {task.completed && (
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "bold" }}>&#10003;</Text>
        )}
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: task.completed ? "400" : "500",
            color: colors.foreground,
            textDecorationLine: task.completed ? "line-through" : "none",
            lineHeight: 22,
          }}
        >
          {task.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: PRIORITY_COLORS[task.priority],
            }}
          />
          <Text style={{ fontSize: 12, color: colors.muted }}>{task.category}</Text>
          {task.dueDate && (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              &middot; {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={onEdit}
        style={({ pressed }) => ({
          padding: 8,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <IconSymbol name="chevron.right" size={18} color={colors.muted} />
      </Pressable>
    </Pressable>
  );
}

export default function TasksScreen() {
  const colors = useColors();
  const { filteredTasks, currentFilter, setFilter, addTask, toggleTask, deleteTask, tasks } =
    useTasks();
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<typeof PRIORITIES[number]>("medium");
  const [category, setCategory] = useState("Work");
  const [dueDate, setDueDate] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const handleAddTask = useCallback(() => {
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      dueDate: dueDate || undefined,
    });
    if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
  }, [title, description, priority, category, dueDate, addTask]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("Work");
    setDueDate("");
    setEditingTask(null);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setCategory(task.category);
    setDueDate(task.dueDate || "");
    setModalVisible(true);
  };

  const filters: { key: TaskFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tasks.filter((t) => !t.completed).length },
    { key: "today", label: "Today", count: tasks.filter((t) => !t.completed && t.dueDate === today).length },
    { key: "upcoming", label: "Upcoming", count: tasks.filter((t) => !t.completed && t.dueDate && t.dueDate > today).length },
    { key: "completed", label: "Done", count: tasks.filter((t) => t.completed).length },
  ];

  return (
    <ScreenContainer className="px-4 pt-2">
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground }}>
            Tasks
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

        {/* Filter Chips */}
        <View style={{ flexDirection: "row", marginBottom: 16, gap: 8 }}>
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => {
                setFilter(f.key);
                if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  currentFilter === f.key ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: currentFilter === f.key ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: currentFilter === f.key ? "#FFFFFF" : colors.foreground,
                }}
              >
                {f.label}
                {f.count > 0 && ` (${f.count})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Task List */}
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={() => toggleTask(item.id)}
              onDelete={() => deleteTask(item.id)}
              onEdit={() => openEditModal(item)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <IconSymbol name="checklist" size={48} color={colors.muted} />
              <Text style={{ fontSize: 16, color: colors.muted, marginTop: 12 }}>
                {currentFilter === "completed"
                  ? "No completed tasks yet"
                  : currentFilter === "today"
                  ? "No tasks for today"
                  : "No tasks yet"}
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
                Tap + to add your first task
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        {/* Add Task Modal */}
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
                  {editingTask ? "Edit Task" : "New Task"}
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
                  placeholder="Task title"
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
                  numberOfLines={3}
                  style={{
                    fontSize: 15,
                    color: colors.foreground,
                    minHeight: 80,
                    textAlignVertical: "top",
                    padding: 12,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />

                {/* Priority */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 8 }}>
                    PRIORITY
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {PRIORITIES.map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setPriority(p)}
                        style={({ pressed }) => ({
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: priority === p ? PRIORITY_COLORS[p] : colors.surface,
                          alignItems: "center",
                          opacity: pressed ? 0.85 : 1,
                          borderWidth: 1,
                          borderColor: priority === p ? PRIORITY_COLORS[p] : colors.border,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: priority === p ? "#FFFFFF" : colors.foreground,
                            textTransform: "capitalize",
                          }}
                        >
                          {p}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Category */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 8 }}>
                    CATEGORY
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {TASK_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={({ pressed }) => ({
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: category === cat ? colors.primary : colors.surface,
                          borderWidth: 1,
                          borderColor: category === cat ? colors.primary : colors.border,
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: category === cat ? "#FFFFFF" : colors.foreground,
                          }}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Due Date */}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 8 }}>
                    DUE DATE (optional)
                  </Text>
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    value={dueDate}
                    onChangeText={setDueDate}
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

                <Pressable
                  onPress={() => {
                    handleAddTask();
                    setModalVisible(false);
                  }}
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
                    {editingTask ? "Update Task" : "Add Task"}
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
