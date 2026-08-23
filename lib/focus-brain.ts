import type { Task } from "./types";

/**
 * A small online neural network for Focus Path.
 *
 * It is intentionally local and interpretable: every completion updates the
 * weights, and the app can explain which task is currently the best focus bet.
 */
export const FOCUS_BRAIN_FEATURES = [
  "urgency",
  "priority",
  "categoryMomentum",
  "taskAge",
  "scheduleFit",
  "workload",
] as const;

export type FocusBrainFeature = (typeof FOCUS_BRAIN_FEATURES)[number];

export interface FocusBrainModel {
  version: 1;
  weights: number[];
  bias: number;
  observations: number;
  correctPredictions: number;
  lastTrainedAt?: string;
}

export interface FocusBrainContext {
  now?: Date;
  pendingCount: number;
  completedCount: number;
  timeBlockTaskIds?: Set<string>;
  categoryCompletionRate?: Record<string, number>;
}

export interface FocusBrainPrediction {
  score: number;
  confidence: number;
  reasons: string[];
  features: number[];
}

const LEARNING_RATE = 0.12;
const FEATURE_COUNT = FOCUS_BRAIN_FEATURES.length;

export function createInitialFocusBrainModel(): FocusBrainModel {
  return {
    version: 1,
    // Gentle priors: urgent, important, and scheduled work rises to the top.
    weights: [0.82, 0.58, 0.42, -0.18, 0.46, -0.3],
    bias: -0.62,
    observations: 0,
    correctPredictions: 0,
  };
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function daysUntil(dateValue: string | undefined, now: Date) {
  if (!dateValue) return 4;
  const target = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(target.getTime())) return 4;
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function taskAgeInDays(task: Task, now: Date) {
  const created = new Date(task.createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.max(0, (now.getTime() - created.getTime()) / 86_400_000);
}

export function getTaskFeatures(task: Task, context: FocusBrainContext) {
  const now = context.now ?? new Date();
  const untilDue = daysUntil(task.dueDate, now);
  const urgency = task.dueDate
    ? clamp(untilDue <= 0 ? 1 : untilDue === 1 ? 0.88 : untilDue <= 3 ? 0.68 : 0.35)
    : 0.22;
  const priority = task.priority === "high" ? 1 : task.priority === "medium" ? 0.62 : 0.28;
  const category = task.category?.trim() || "Uncategorized";
  const categoryMomentum = clamp(context.categoryCompletionRate?.[category] ?? 0.5);
  const taskAge = clamp(taskAgeInDays(task, now) / 14);
  const scheduleFit = context.timeBlockTaskIds?.has(task.id) ? 1 : 0.18;
  const workload = clamp(context.pendingCount / 10);

  return [urgency, priority, categoryMomentum, taskAge, scheduleFit, workload];
}

export function predictTask(
  model: FocusBrainModel,
  task: Task,
  context: FocusBrainContext,
): FocusBrainPrediction {
  const features = getTaskFeatures(task, context);
  const weights = model.weights.length === FEATURE_COUNT
    ? model.weights
    : createInitialFocusBrainModel().weights;
  const activation = weights.reduce((sum, weight, index) => sum + weight * features[index], model.bias);
  const score = sigmoid(activation);
  const reasons: string[] = [];

  if (features[0] >= 0.68) reasons.push(task.dueDate && features[0] >= 0.88 ? "due soon" : "timely");
  if (features[1] >= 0.62) reasons.push(task.priority === "high" ? "high priority" : "medium priority");
  if (features[2] >= 0.68) reasons.push("strong category momentum");
  if (features[3] >= 0.55) reasons.push("has been waiting");
  if (features[4] >= 0.8) reasons.push("already scheduled");
  if (reasons.length === 0) reasons.push("balanced next step");

  return {
    score,
    confidence: clamp(0.52 + Math.min(model.observations, 24) / 48),
    reasons,
    features,
  };
}

export function trainFocusBrain(
  model: FocusBrainModel,
  task: Task,
  context: FocusBrainContext,
  outcome: 0 | 1,
): FocusBrainModel {
  const prediction = predictTask(model, task, context);
  const error = outcome - prediction.score;
  const weights = prediction.features.map(
    (feature, index) => (model.weights[index] ?? 0) + LEARNING_RATE * error * feature,
  );
  const predictedLabel = prediction.score >= 0.5 ? 1 : 0;

  return {
    version: 1,
    weights,
    bias: model.bias + LEARNING_RATE * error,
    observations: model.observations + 1,
    correctPredictions: model.correctPredictions + (predictedLabel === outcome ? 1 : 0),
    lastTrainedAt: new Date().toISOString(),
  };
}

export function getModelAccuracy(model: FocusBrainModel) {
  return model.observations ? Math.round((model.correctPredictions / model.observations) * 100) : null;
}

export function getFocusBrainContext(
  tasks: Task[],
  timeBlockTaskIds: Set<string> = new Set(),
): FocusBrainContext {
  const completedTasks = tasks.filter((task) => task.completed);
  const categoryTotals: Record<string, number> = {};
  const categoryCompleted: Record<string, number> = {};

  tasks.forEach((task) => {
    const category = task.category?.trim() || "Uncategorized";
    categoryTotals[category] = (categoryTotals[category] ?? 0) + 1;
    if (task.completed) categoryCompleted[category] = (categoryCompleted[category] ?? 0) + 1;
  });

  const categoryCompletionRate = Object.fromEntries(
    Object.entries(categoryTotals).map(([category, total]) => [
      category,
      (categoryCompleted[category] ?? 0) / total,
    ]),
  );

  return {
    pendingCount: tasks.length - completedTasks.length,
    completedCount: completedTasks.length,
    timeBlockTaskIds,
    categoryCompletionRate,
  };
}

export function getRecommendedTask(
  model: FocusBrainModel,
  tasks: Task[],
  context: FocusBrainContext,
) {
  return tasks
    .filter((task) => !task.completed)
    .map((task) => ({ task, prediction: predictTask(model, task, context) }))
    .sort((left, right) => right.prediction.score - left.prediction.score)[0] ?? null;
}
