# FocusPath — Mobile App Design Document

## Overview

FocusPath is a personal productivity and career guidance app that combines task management, time planning, goal tracking, and an AI-powered Digital Mentor. The app helps users organize their daily work while receiving personalized career guidance grounded in their actual strengths, interests, and market realities.

## Brand Colors

- **Primary:** `#6C5CE7` (Deep Purple) — ambition, focus, creativity
- **Secondary/Accent:** `#A29BFE` (Soft Lavender) — calm, reflection
- **Background:** `#FAFAFC` (near-white) light / `#0F0F14` (deep dark) dark
- **Surface:** `#FFFFFF` light / `#1A1A24` dark
- **Foreground:** `#1A1A2E` light / `#EAEAEA` dark
- **Muted:** `#8B8DA3` light / `#6B6B80` dark
- **Border:** `#E2E4EB` light / `#2A2A3A` dark
- **Success:** `#00B894` (Teal Green)
- **Warning:** `#FDCB6E` (Warm Amber)
- **Error:** `#E17055` (Coral Red)

## Screen List

### Tab Screens (Bottom Navigation)

1. **Home / Dashboard** — `app/(tabs)/index.tsx`
   - Today's overview: tasks due, upcoming time blocks, goal progress
   - Quick actions: add task, start focus session
   - Motivational quote or digital mentor insight card

2. **Tasks** — `app/(tabs)/tasks.tsx`
   - Task list with filters (All, Today, Upcoming, Completed)
   - Add task with title, description, priority (low/medium/high), due date, category
   - Swipe to complete, delete
   - Categories/tags for organizing (Work, Learning, Health, Personal)

3. **Plan** — `app/(tabs)/plan.tsx`
   - Time blocking view: day view with hourly slots
   - Create time blocks for focused work
   - Link tasks to time blocks
   - Pomodoro timer for focused sessions

4. **Goals** — `app/(tabs)/goals.tsx`
   - Goal list with progress bars
   - Create goals with title, target date, milestones
   - Milestone checklist within each goal
   - Visual progress tracking (percentage)

5. **Mentor** — `app/(tabs)/mentor.tsx`
   - AI chat interface with Digital Mentor
   - Conversation history persisted locally
   - Profile card showing user's strengths/weaknesses/interests (from conversations)
   - Quick prompts: "Explore career paths", "Review my strengths", "Market check"

### Non-Tab Screens

6. **Task Detail** — `app/task/[id].tsx`
   - Edit task properties, add subtasks, notes

7. **Goal Detail** — `app/goal/[id].tsx`
   - Edit goal, manage milestones, view progress

8. **Mentor Settings** — `app/mentor/settings.tsx`
   - View/edit career profile (strengths, weaknesses, interests)
   - Reset conversation history

## Data Model (AsyncStorage)

### Task
```ts
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  completed: boolean;
  dueDate?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  timeBlockId?: string; // linked time block
}
```

### TimeBlock
```ts
interface TimeBlock {
  id: string;
  title: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  date: string; // ISO date
  taskId?: string;
  color: string; // color code for visual distinction
  completed: boolean;
}
```

### Goal
```ts
interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  progress: number; // 0-100
  milestones: Milestone[];
  createdAt: string;
  color: string;
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}
```

### MentorMessage
```ts
interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

### CareerProfile
```ts
interface CareerProfile {
  strengths: string[];
  weaknesses: string[];
  interests: string[];
  currentRole?: string;
  lastUpdated: string;
}
```

## Key User Flows

### Task Creation Flow
1. User taps "+" FAB on Tasks screen
2. Bottom sheet slides up with form
3. User fills: title, priority, category, due date
4. Tap "Add Task" → saved to AsyncStorage → haptic feedback

### Time Planning Flow
1. User navigates to Plan tab
2. Sees today's calendar view with existing time blocks
3. Taps empty slot → creates new time block
4. Optionally links to an existing task
5. Can start Pomodoro timer for the block

### Goal Creation Flow
1. User navigates to Goals tab
2. Taps "+" to create goal
3. Fills: title, target date, adds milestones
4. Progress auto-calculates from completed milestones

### Digital Mentor Flow
1. User navigates to Mentor tab
2. Sees chat interface with conversation history
3. Types a message or selects a quick prompt
4. Message sent to server LLM API
5. Response streamed/displayed
6. AI extracts career profile insights from conversation context

### Dashboard Flow
1. User opens app → sees Dashboard
2. Shows today's stats: pending tasks count, active goals progress
3. Quick action buttons
4. Daily insight from mentor

## Navigation Structure

```
(Tabs)
├── Home (index)
├── Tasks
├── Plan
├── Goals
└── Mentor

(Stack, nested)
├── task/[id]
├── goal/[id]
├── mentor/settings
└── mentor/chat (if needed)
```

## Icon Mapping (SF Symbols → MaterialIcons)

| SF Symbol | Material Icon | Tab |
|-----------|--------------|-----|
| house.fill | home | Home |
| checklist | check-box | Tasks |
| schedule | calendar-today | Plan |
| flag | flag | Goals |
| smart_toy | psychology | Mentor |
