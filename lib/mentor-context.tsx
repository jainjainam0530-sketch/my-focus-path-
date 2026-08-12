import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { KEYS, getStorage, setStorage } from "./storage";
import type { MentorMessage, CareerProfile } from "./types";
import { trpc } from "@/lib/trpc";

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface MentorContextType {
  messages: MentorMessage[];
  careerProfile: CareerProfile;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  updateProfile: (updates: Partial<CareerProfile>) => Promise<void>;
  isLoading: boolean;
}

const defaultProfile: CareerProfile = {
  strengths: [],
  weaknesses: [],
  interests: [],
  lastUpdated: new Date().toISOString(),
};

const MentorContext = createContext<MentorContextType | null>(null);

export function MentorProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [careerProfile, setCareerProfile] = useState<CareerProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(false);

  const chatMutation = trpc.mentor.chat.useMutation();

  useEffect(() => {
    getStorage<MentorMessage[]>(KEYS.MENTOR_MESSAGES, []).then(setMessages);
    getStorage<CareerProfile>(KEYS.CAREER_PROFILE, defaultProfile).then(setCareerProfile);
  }, []);

  const saveMessages = useCallback((newMessages: MentorMessage[]) => {
    setMessages(newMessages);
    setStorage(KEYS.MENTOR_MESSAGES, newMessages);
  }, []);

  const saveProfile = useCallback((profile: CareerProfile) => {
    setCareerProfile(profile);
    setStorage(KEYS.CAREER_PROFILE, profile);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: MentorMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMsg];
      saveMessages(updatedMessages);
      setIsLoading(true);

      try {
        // Build conversation history for context
        const history = updatedMessages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await chatMutation.mutateAsync({
          messages: history,
          careerProfile,
        });

        const assistantMsg: MentorMessage = {
          id: generateId(),
          role: "assistant",
          content: response.text,
          timestamp: new Date().toISOString(),
        };

        const finalMessages = [...updatedMessages, assistantMsg];
        saveMessages(finalMessages);

        // Update career profile if returned
        if (response.updatedProfile) {
          saveProfile({
            ...response.updatedProfile,
            lastUpdated: new Date().toISOString(),
          });
        }
      } catch (error) {
        const errorMsg: MentorMessage = {
          id: generateId(),
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date().toISOString(),
        };
        saveMessages([...updatedMessages, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, careerProfile, chatMutation, saveMessages, saveProfile]
  );

  const clearHistory = useCallback(async () => {
    saveMessages([]);
  }, [saveMessages]);

  const updateProfile = useCallback(
    async (updates: Partial<CareerProfile>) => {
      saveProfile({ ...careerProfile, ...updates, lastUpdated: new Date().toISOString() });
    },
    [careerProfile, saveProfile]
  );

  return (
    <MentorContext.Provider
      value={{ messages, careerProfile, sendMessage, clearHistory, updateProfile, isLoading }}
    >
      {children}
    </MentorContext.Provider>
  );
}

export function useMentor() {
  const ctx = useContext(MentorContext);
  if (!ctx) throw new Error("useMentor must be used within MentorProvider");
  return ctx;
}
