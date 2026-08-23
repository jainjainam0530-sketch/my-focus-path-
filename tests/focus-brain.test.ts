import { describe, expect, it } from "vitest";

import {
  createInitialFocusBrainModel,
  getFocusBrainContext,
  getRecommendedTask,
  predictTask,
  trainFocusBrain,
} from "../lib/focus-brain";
import type { Task } from "../lib/types";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write project brief",
    priority: "medium",
    category: "Work",
    completed: false,
    createdAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
    ...overrides,
  };
}

describe("Focus Brain", () => {
  it("ranks urgent high-priority work above an unscheduled low-priority task", () => {
    const tasks = [
      task({ id: "urgent", title: "Submit report", priority: "high", dueDate: "2026-08-23" }),
      task({ id: "later", title: "Organize notes", priority: "low", dueDate: "2026-08-30" }),
    ];
    const model = createInitialFocusBrainModel();
    const recommendation = getRecommendedTask(
      model,
      tasks,
      getFocusBrainContext(tasks, new Set(["urgent"])),
    );

    expect(recommendation?.task.id).toBe("urgent");
    expect(recommendation?.prediction.reasons).toContain("due soon");
  });

  it("updates its prediction after a completion outcome", () => {
    const focusTask = task({ priority: "high", dueDate: "2026-08-23" });
    const model = createInitialFocusBrainModel();
    const context = getFocusBrainContext([focusTask]);
    const before = predictTask(model, focusTask, context);
    const learned = trainFocusBrain(model, focusTask, context, 1);
    const after = predictTask(learned, focusTask, context);

    expect(learned.observations).toBe(1);
    expect(after.score).toBeGreaterThan(before.score);
  });
});
