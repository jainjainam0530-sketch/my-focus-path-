export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  category: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  timeBlockId?: string;
}

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  taskId?: string;
  color: string;
  completed: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  progress: number;
  milestones: Milestone[];
  createdAt: string;
  color: string;
}

export interface MentorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface CareerProfile {
  strengths: string[];
  weaknesses: string[];
  interests: string[];
  currentRole?: string;
  lastUpdated: string;
}

export type TaskFilter = "all" | "today" | "upcoming" | "completed";
