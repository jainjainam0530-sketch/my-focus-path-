import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { KEYS, getStorage, setStorage } from "./storage";
import type { TimeBlock } from "./types";
import { scheduleTimeBlockReminder, cancelNotification } from "./notifications";

function generateId(): string {
  return `tb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface TimeBlocksContextType {
  timeBlocks: TimeBlock[];
  addBlock: (block: Omit<TimeBlock, "id" | "completed">) => Promise<void>;
  updateBlock: (id: string, updates: Partial<TimeBlock>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  toggleBlock: (id: string) => Promise<void>;
  getBlocksForDate: (date: string) => TimeBlock[];
}

const TimeBlocksContext = createContext<TimeBlocksContextType | null>(null);

export function TimeBlocksProvider({ children }: { children: ReactNode }) {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

  useEffect(() => {
    getStorage<TimeBlock[]>(KEYS.TIME_BLOCKS, []).then(setTimeBlocks);
  }, []);

  const save = useCallback((newBlocks: TimeBlock[]) => {
    setTimeBlocks(newBlocks);
    setStorage(KEYS.TIME_BLOCKS, newBlocks);
  }, []);

  const addBlock = useCallback(
    async (blockData: Omit<TimeBlock, "id" | "completed">) => {
      const newBlock: TimeBlock = { ...blockData, id: generateId(), completed: false };
      const updated = [...timeBlocks, newBlock];
      save(updated);

      // Schedule notification for time block
      if (!newBlock.completed) {
        await scheduleTimeBlockReminder(newBlock.id, newBlock.title, newBlock.startTime);
      }
    },
    [timeBlocks, save]
  );

  const updateBlock = useCallback(
    async (id: string, updates: Partial<TimeBlock>) => {
      const updated = timeBlocks.map((b) => (b.id === id ? { ...b, ...updates } : b));
      save(updated);

      // Reschedule notification
      const block = updated.find((b) => b.id === id);
      if (block) {
        await cancelNotification(`block_${id}`);
        if (!block.completed) {
          await scheduleTimeBlockReminder(block.id, block.title, block.startTime);
        }
      }
    },
    [timeBlocks, save]
  );

  const deleteBlock = useCallback(
    async (id: string) => {
      save(timeBlocks.filter((b) => b.id !== id));
      await cancelNotification(`block_${id}`);
    },
    [timeBlocks, save]
  );

  const toggleBlock = useCallback(
    async (id: string) => {
      const updated = timeBlocks.map((b) =>
        b.id === id ? { ...b, completed: !b.completed } : b
      );
      save(updated);

      // Cancel notification when completed
      const block = updated.find((b) => b.id === id);
      if (block?.completed) {
        await cancelNotification(`block_${id}`);
      }
    },
    [timeBlocks, save]
  );

  const getBlocksForDate = useCallback(
    (date: string) => {
      return timeBlocks
        .filter((b) => b.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    [timeBlocks]
  );

  return (
    <TimeBlocksContext.Provider
      value={{ timeBlocks, addBlock, updateBlock, deleteBlock, toggleBlock, getBlocksForDate }}
    >
      {children}
    </TimeBlocksContext.Provider>
  );
}

export function useTimeBlocks() {
  const ctx = useContext(TimeBlocksContext);
  if (!ctx) throw new Error("useTimeBlocks must be used within TimeBlocksProvider");
  return ctx;
}
