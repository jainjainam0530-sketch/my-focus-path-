import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function InstagramOAuthReturnScreen() {
  const { instagram, message } = useLocalSearchParams<{ instagram?: string; message?: string }>();
  const success = instagram === "success";
  const copy = message || (success ? "Instagram is connected and ready for manual publishing." : "The Instagram connection was not completed.");

  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => router.replace("/(tabs)/content"), 1300);
    return () => clearTimeout(timeout);
  }, [success]);

  return (
    <ScreenContainer style={styles.safeArea}>
      <View style={styles.canvas}>
        <Text style={styles.kicker}>FOCUSPATH / INSTAGRAM</Text>
        <Text style={styles.title}>{success ? "Connection complete." : "Connection paused."}</Text>
        <Text style={styles.copy}>{copy}</Text>
        <Pressable onPress={() => router.replace("/(tabs)/content")} style={styles.button}>
          <Text style={styles.buttonText}>Return to Content</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#0B1220" },
  canvas: { alignItems: "center", backgroundColor: "#0B1220", flex: 1, justifyContent: "center", padding: 28 },
  kicker: { color: "#A79CFF", fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 12 },
  title: { color: "#F8FAFC", fontSize: 29, fontWeight: "800", letterSpacing: -0.7, textAlign: "center" },
  copy: { color: "#AEBBD0", fontSize: 14, lineHeight: 22, marginTop: 14, maxWidth: 420, textAlign: "center" },
  button: { backgroundColor: "#6C4CF5", marginTop: 26, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
