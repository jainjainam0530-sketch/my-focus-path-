import { useState, useCallback, useRef, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useMentor } from "@/lib/mentor-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { MentorMessage } from "@/lib/types";
import { Platform as RNPlatform } from "react-native";
import * as Haptics from "expo-haptics";

const QUICK_PROMPTS = [
  "Explore career paths for me",
  "Review my strengths",
  "Check market demand",
  "Suggest a hybrid career",
];

function MessageBubble({ message }: { message: MentorMessage }) {
  const colors = useColors();
  const isUser = message.role === "user";

  return (
    <View
      style={{
        marginBottom: 12,
        alignItems: isUser ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          maxWidth: "85%",
          padding: 14,
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          backgroundColor: isUser ? colors.primary : colors.surface,
          borderWidth: isUser ? 0 : 1,
          borderColor: isUser ? "transparent" : colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            color: isUser ? "#FFFFFF" : colors.foreground,
          }}
        >
          {message.content}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: isUser ? "rgba(255,255,255,0.7)" : colors.muted,
            marginTop: 6,
            alignSelf: "flex-end",
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}

export default function MentorScreen() {
  const colors = useColors();
  const { messages, sendMessage, isLoading, careerProfile } = useMentor();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList<MentorMessage>>(null);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText.trim());
    setInputText("");
    if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [inputText, isLoading, sendMessage]);

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
      if (RNPlatform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [sendMessage]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading]);

  const hasProfile =
    careerProfile.strengths.length > 0 ||
    careerProfile.interests.length > 0;

  return (
    <ScreenContainer className="px-0 pt-0">
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
              Digital Mentor
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Your AI career guide
            </Text>
          </View>
          {hasProfile && (
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <IconSymbol name="person.fill" size={16} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary, marginLeft: 4 }}>
                Profile
              </Text>
            </Pressable>
          )}
        </View>

        {/* Career Profile Summary */}
        {hasProfile && messages.length <= 1 && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: 8 }}>
              Your Career Profile
            </Text>
            {careerProfile.strengths.length > 0 && (
              <Text style={{ fontSize: 12, color: colors.foreground, marginBottom: 4 }}>
                <Text style={{ fontWeight: "600" }}>Strengths: </Text>
                {careerProfile.strengths.join(", ")}
              </Text>
            )}
            {careerProfile.interests.length > 0 && (
              <Text style={{ fontSize: 12, color: colors.foreground, marginBottom: 4 }}>
                <Text style={{ fontWeight: "600" }}>Interests: </Text>
                {careerProfile.interests.join(", ")}
              </Text>
            )}
            {careerProfile.weaknesses.length > 0 && (
              <Text style={{ fontSize: 12, color: colors.foreground }}>
                <Text style={{ fontWeight: "600" }}>Areas to grow: </Text>
                {careerProfile.weaknesses.join(", ")}
              </Text>
            )}
          </View>
        )}

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 8 }}>
              TRY ASKING
            </Text>
            <View style={{ gap: 8 }}>
              {QUICK_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  onPress={() => handleQuickPrompt(prompt)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, color: colors.foreground }}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 100,
          }}
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <IconSymbol name="target" size={48} color={colors.primary} />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.foreground,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  Meet Your Digital Mentor
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.muted,
                    marginTop: 8,
                    textAlign: "center",
                    lineHeight: 22,
                    paddingHorizontal: 20,
                  }}
                >
                  I help you cut through noise and find the career direction that fits who you
                  actually are. Tell me about your strengths, interests, and goals.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 10 }}>
                  Thinking...
                </Text>
              </View>
            ) : null
          }
        />

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          <TextInput
            placeholder="Ask your mentor..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              fontSize: 15,
              color: colors.foreground,
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: colors.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 42,
              maxHeight: 120,
            }}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: inputText.trim() && !isLoading ? colors.primary : colors.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </ScreenContainer>
  );
}
