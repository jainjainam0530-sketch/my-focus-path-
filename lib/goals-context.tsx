import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { KEYS, getStorage, setStorage } from "./storage";
import type { Goal, Milestone } from "./types";
import { scheduleGoalReminder, cancelNotification } from "./notifications";

function generateId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function calculateProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
}

interface GoalsContextType {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "progress">) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addMilestone: (goalId: string, title: string) => Promise<void>;
  toggleMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  deleteMilestone: (goalId: string, milestoneId: string) => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | null>(null);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    getStorage<Goal[]>(KEYS.GOALS, []).then(setGoals);
  }, []);

  const save = useCallback((newGoals: Goal[]) => {
    setGoals(newGoals);
    setStorage(KEYS.GOALS, newGoals);
  }, []);

  const addGoal = useCallback(
    async (goalData: Omit<Goal, "id" | "createdAt" | "progress">) => {
      const newGoal: Goal = {
        ...goalData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        progress: calculateProgress(goalData.milestones),
      };
      const updated = [...goals, newGoal];
      save(updated);

      // Schedule reminder if target date is set
      if (newGoal.targetDate && newGoal.progress < 100) {
        await scheduleGoalReminder(newGoal.id, newGoal.title, newGoal.targetDate);
      }
    },
    [goals, save]
  );

  const updateGoal = useCallback(
    async (id: string, updates: Partial<Goal>) => {
      const updated = goals.map((g) => {
        if (g.id !== id) return g;
        const merged = { ...g, ...updates };
        return { ...merged, progress: calculateProgress(merged.milestones) };
      });
      save(updated);

      // Reschedule reminder
      const goal = updated.find((g) => g.id === id);
      if (goal) {
        await cancelNotification(`goal_${id}`);
        if (goal.targetDate && goal.progress < 100) {
          await scheduleGoalReminder(goal.id, goal.title, goal.targetDate);
        }
      }
    },
    [goals, save]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      save(goals.filter((g) => g.id !== id));
      await cancelNotification(`goal_${id}`);
    },
    [goals, save]
  );

  const addMilestone = useCallback(
    async (goalId: string, title: string) => {
      const updated = goals.map((g) => {
        if (g.id !== goalId) return g;
        const newMilestone: Milestone = {
          id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          title,
          completed: false,
        };
        const milestones = [...g.milestones, newMilestone];
        return { ...g, milestones, progress: calculateProgress(milestones) };
      });
      save(updated);
    },
    [goals, save]
  );

  const toggleMilestone = useCallback(
    async (goalId: string, milestoneId: string) => {
      const updated = goals.map((g) => {
        if (g.id !== goalId) return g;
        const milestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        return { ...g, milestones, progress: calculateProgress(milestones) };
      });
      save(updated);
    },
    [goals, save]
  );

  const deleteMilestone = useCallback(
    async (goalId: string, milestoneId: string) => {
      const updated = goals.map((g) => {
        if (g.id !== goalId) return g;
        const milestones = g.milestones.filter((m) => m.id !== milestoneId);
        return { ...g, milestones, progress: calculateProgress(milestones) };
      });
      save(updated);
    },
    [goals, save]
  );

  return (
    <GoalsContext.Provider
      value={{
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        addMilestone,
        toggleMilestone,
        deleteMilestone,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}
