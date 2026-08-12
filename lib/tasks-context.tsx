import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { KEYS, getStorage, setStorage } from "./storage";
import type { Task, TaskFilter } from "./types";
import { scheduleTaskReminder, cancelNotification } from "./notifications";

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface TasksContextType {
  tasks: Task[];
  filteredTasks: Task[];
  currentFilter: TaskFilter;
  setFilter: (filter: TaskFilter) => void;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "completed">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTodayCount: () => number;
  getPendingCount: () => number;
}

const TasksContext = createContext<TasksContextType | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentFilter, setCurrentFilter] = useState<TaskFilter>("all");

  useEffect(() => {
    getStorage<Task[]>(KEYS.TASKS, []).then(setTasks);
  }, []);

  const saveTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
    setStorage(KEYS.TASKS, newTasks);
  }, []);

  const addTask = useCallback(
    async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "completed">) => {
      const now = new Date().toISOString();
      const newTask: Task = {
        ...taskData,
        id: generateId(),
        completed: false,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [...tasks, newTask];
      saveTasks(updated);

      // Schedule notification if due date is set
      if (newTask.dueDate) {
        await scheduleTaskReminder(newTask.id, newTask.title, newTask.dueDate);
      }
    },
    [tasks, saveTasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      const updated = tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      saveTasks(updated);

      // Reschedule or cancel notification
      const task = updated.find((t) => t.id === id);
      if (task) {
        await cancelNotification(`task_${id}`);
        if (task.dueDate && !task.completed) {
          await scheduleTaskReminder(task.id, task.title, task.dueDate);
        }
      }
    },
    [tasks, saveTasks]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const updated = tasks.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() }
          : t
      );
      saveTasks(updated);

      // Cancel notification when completed
      const task = updated.find((t) => t.id === id);
      if (task?.completed) {
        await cancelNotification(`task_${id}`);
      }
    },
    [tasks, saveTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      saveTasks(tasks.filter((t) => t.id !== id));
      await cancelNotification(`task_${id}`);
    },
    [tasks, saveTasks]
  );

  const today = new Date().toISOString().split("T")[0];

  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === "completed") return task.completed;
    if (currentFilter === "today") return !task.completed && task.dueDate === today;
    if (currentFilter === "upcoming") return !task.completed && task.dueDate && task.dueDate > today;
    return true;
  });

  const getTodayCount = useCallback(() => {
    return tasks.filter((t) => !t.completed && t.dueDate === today).length;
  }, [tasks]);

  const getPendingCount = useCallback(() => {
    return tasks.filter((t) => !t.completed).length;
  }, [tasks]);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        filteredTasks,
        currentFilter,
        setFilter: setCurrentFilter,
        addTask,
        updateTask,
        toggleTask,
        deleteTask,
        getTodayCount,
        getPendingCount,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
}
