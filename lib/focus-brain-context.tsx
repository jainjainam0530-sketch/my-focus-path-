import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useTasks } from "./tasks-context";
import { useTimeBlocks } from "./timeblocks-context";
import {
  createInitialFocusBrainModel,
  getFocusBrainContext,
  getModelAccuracy,
  getRecommendedTask,
  predictTask,
  trainFocusBrain,
  type FocusBrainModel,
  type FocusBrainPrediction,
} from "./focus-brain";
import { KEYS, getStorage, setStorage } from "./storage";
import type { Task } from "./types";

interface FocusBrainContextValue {
  model: FocusBrainModel;
  recommendedTask: { task: Task; prediction: FocusBrainPrediction } | null;
  accuracy: number | null;
  isReady: boolean;
  resetLearning: () => Promise<void>;
}

const FocusBrainContext = createContext<FocusBrainContextValue | null>(null);

export function FocusBrainProvider({ children }: { children: ReactNode }) {
  const { tasks } = useTasks();
  const { timeBlocks } = useTimeBlocks();
  const [model, setModel] = useState<FocusBrainModel>(createInitialFocusBrainModel);
  const [isReady, setIsReady] = useState(false);
  const previousTasksRef = useRef<Task[]>([]);

  useEffect(() => {
    getStorage<FocusBrainModel | null>(KEYS.FOCUS_BRAIN_MODEL, null).then((savedModel) => {
      if (savedModel?.version === 1 && savedModel.weights.length === 6) {
        setModel(savedModel);
      }
      setIsReady(true);
    });
  }, []);

  const timeBlockTaskIds = useMemo(
    () => new Set(timeBlocks.filter((block) => block.taskId).map((block) => block.taskId as string)),
    [timeBlocks],
  );

  const brainContext = useMemo(
    () => getFocusBrainContext(tasks, timeBlockTaskIds),
    [tasks, timeBlockTaskIds],
  );

  // A completion or un-completion is the model's training signal. The previous
  // task snapshot keeps the feature vector representative of the user's intent
  // before the outcome changed.
  useEffect(() => {
    const previousTasks = previousTasksRef.current;
    if (isReady && previousTasks.length) {
      const previousById = new Map(previousTasks.map((task) => [task.id, task]));
      const changedTasks = tasks.filter((task) => {
        const previous = previousById.get(task.id);
        return previous && previous.completed !== task.completed;
      });

      if (changedTasks.length) {
        const previousContext = getFocusBrainContext(previousTasks, timeBlockTaskIds);
        setModel((current) => {
          const nextModel = changedTasks.reduce(
            (next, task) => trainFocusBrain(next, task, previousContext, task.completed ? 1 : 0),
            current,
          );
          void setStorage(KEYS.FOCUS_BRAIN_MODEL, nextModel);
          return nextModel;
        });
      }
    }
    previousTasksRef.current = tasks;
  }, [tasks, timeBlockTaskIds, isReady]);

  const resetLearning = useCallback(async () => {
    const freshModel = createInitialFocusBrainModel();
    setModel(freshModel);
    await setStorage(KEYS.FOCUS_BRAIN_MODEL, freshModel);
  }, []);

  const recommendedTask = useMemo(
    () => getRecommendedTask(model, tasks, brainContext),
    [model, tasks, brainContext],
  );

  return (
    <FocusBrainContext.Provider
      value={{
        model,
        recommendedTask,
        accuracy: getModelAccuracy(model),
        isReady,
        resetLearning,
      }}
    >
      {children}
    </FocusBrainContext.Provider>
  );
}

export function useFocusBrain() {
  const context = useContext(FocusBrainContext);
  if (!context) throw new Error("useFocusBrain must be used within FocusBrainProvider");
  return context;
}

export { predictTask };
