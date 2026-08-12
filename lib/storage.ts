import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  TASKS: "@focuspath_tasks",
  TIME_BLOCKS: "@focuspath_timeblocks",
  GOALS: "@focuspath_goals",
  MENTOR_MESSAGES: "@focuspath_mentor_messages",
  CAREER_PROFILE: "@focuspath_career_profile",
  NOTIFICATION_IDS: "@focuspath_notification_ids",
} as const;

export async function getStorage<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setStorage<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}

export { KEYS };
