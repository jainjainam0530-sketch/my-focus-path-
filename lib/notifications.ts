import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getStorage, setStorage, KEYS } from "./storage";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initNotifications() {
  if (Platform.OS === "web") return;

  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
      android: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (status !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    // Set up Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("focuspath-reminders", {
        name: "FocusPath Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6C5CE7",
      });
    }

    console.log("Notifications initialized");
  } catch (error) {
    console.error("Failed to initialize notifications:", error);
  }
}

// Track scheduled notification IDs
async function getNotificationIds(): Promise<string[]> {
  return getStorage<string[]>(KEYS.NOTIFICATION_IDS, []);
}

async function addNotificationId(id: string) {
  const ids = await getNotificationIds();
  if (!ids.includes(id)) {
    ids.push(id);
    await setStorage(KEYS.NOTIFICATION_IDS, ids);
  }
}

async function removeNotificationId(id: string) {
  const ids = await getNotificationIds();
  const filtered = ids.filter((nId) => nId !== id);
  await setStorage(KEYS.NOTIFICATION_IDS, filtered);
}

// Cancel all notifications for a given identifier
export async function cancelNotification(identifier: string) {
  const ids = await getNotificationIds();
  const related = ids.filter((id) => id.startsWith(identifier));
  for (const id of related) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await removeNotificationId(id);
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setStorage(KEYS.NOTIFICATION_IDS, []);
}

// Schedule a task reminder
export async function scheduleTaskReminder(taskId: string, title: string, dueDate: string) {
  if (Platform.OS === "web") return;

  // Cancel existing notification for this task
  await cancelNotification(`task_${taskId}`);

  const due = new Date(dueDate + "T09:00:00");
  const now = new Date();

  if (due <= now) return; // Don't schedule if already past

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: `task_${taskId}`,
      content: {
        title: "Task Due",
        body: `${title} is due today!`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: due,
        channelId: "focuspath-reminders",
      },
    });
    await addNotificationId(notificationId);
  } catch (error) {
    console.error("Failed to schedule task notification:", error);
  }
}

// Schedule a time block reminder
export async function scheduleTimeBlockReminder(blockId: string, title: string, startTime: string) {
  if (Platform.OS === "web") return;

  await cancelNotification(`block_${blockId}`);

  const [hours, minutes] = startTime.split(":").map(Number);
  const now = new Date();
  const blockDate = new Date(now);
  blockDate.setHours(hours, minutes, 0, 0);

  // If block is today and less than 10 min away, skip
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  if (blockDate < tenMinAgo) return;

  // Schedule 10 minutes before
  const reminderDate = new Date(blockDate.getTime() - 10 * 60 * 1000);
  if (reminderDate <= now) return;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: `block_${blockId}`,
      content: {
        title: "Focus Session Starting",
        body: `${title} starts in 10 minutes`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        channelId: "focuspath-reminders",
      },
    });
    await addNotificationId(notificationId);
  } catch (error) {
    console.error("Failed to schedule time block notification:", error);
  }
}

// Schedule a goal reminder
export async function scheduleGoalReminder(goalId: string, title: string, targetDate: string) {
  if (Platform.OS === "web") return;

  await cancelNotification(`goal_${goalId}`);

  const target = new Date(targetDate);
  const now = new Date();

  // Schedule 1 day before target
  const reminderDate = new Date(target.getTime() - 24 * 60 * 60 * 1000);
  if (reminderDate <= now) return;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: `goal_${goalId}`,
      content: {
        title: "Goal Deadline Approaching",
        body: `${title} is due tomorrow!`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        channelId: "focuspath-reminders",
      },
    });
    await addNotificationId(notificationId);
  } catch (error) {
    console.error("Failed to schedule goal notification:", error);
  }
}
