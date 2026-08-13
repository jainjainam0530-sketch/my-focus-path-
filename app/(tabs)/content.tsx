import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { createURL } from "expo-linking";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

type ContentType = "IMAGE" | "REEL" | "STORY" | "CAROUSEL";

type ComposerState = {
  contentType: ContentType;
  caption: string;
  mediaUrl: string;
  carouselUrls: string;
  altText: string;
  isAiGenerated: boolean;
};

const CONTENT_TYPES: { id: ContentType; label: string; helper: string }[] = [
  { id: "IMAGE", label: "Image", helper: "One public JPEG image" },
  { id: "REEL", label: "Reel", helper: "One public video URL" },
  { id: "STORY", label: "Story", helper: "One public image or video" },
  { id: "CAROUSEL", label: "Carousel", helper: "2–10 public image/video URLs" },
];

const EMPTY_COMPOSER: ComposerState = {
  contentType: "IMAGE",
  caption: "",
  mediaUrl: "",
  carouselUrls: "",
  altText: "",
  isAiGenerated: false,
};

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function draftStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function isPublished(status: string) {
  return status === "PUBLISHED";
}

function ComposerField({ label, value, onChangeText, placeholder, multiline = false, helper }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  helper?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#5E708C"
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.field, multiline && styles.fieldMultiline]}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

export default function ContentScreen() {
  const utils = trpc.useUtils();
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [notice, setNotice] = useState<string | null>(null);
  const statusQuery = trpc.instagram.status.useQuery(undefined, { refetchOnMount: "always" });
  const draftsQuery = trpc.instagram.listDrafts.useQuery(undefined, { refetchOnMount: "always" });

  const invalidate = async () => {
    await Promise.all([utils.instagram.status.invalidate(), utils.instagram.listDrafts.invalidate()]);
  };

  const connect = trpc.instagram.beginConnection.useMutation({
    onSuccess: async ({ authorizationUrl }) => {
      try {
        const returnUrl = createURL("oauth/instagram");
        const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, returnUrl);
        if (result.type === "success") {
          setNotice("Instagram connection updated.");
          await invalidate();
        }
      } catch {
        setNotice("The Instagram sign-in window could not be opened. Try again from a supported browser.");
      }
    },
    onError: (error) => setNotice(error.message),
  });

  const disconnect = trpc.instagram.disconnect.useMutation({
    onSuccess: async () => {
      setNotice("Instagram has been disconnected and the locally stored credential was erased.");
      await invalidate();
    },
    onError: (error) => setNotice(error.message),
  });

  const createDraft = trpc.instagram.createDraft.useMutation({
    onSuccess: async () => {
      setComposer(EMPTY_COMPOSER);
      setNotice("Draft saved. Review it below, then choose Publish when you are ready.");
      await invalidate();
    },
    onError: (error) => setNotice(error.message),
  });

  const publishDraft = trpc.instagram.publishDraft.useMutation({
    onSuccess: async (result) => {
      setNotice(result.message);
      await invalidate();
    },
    onError: async (error) => {
      setNotice(error.message);
      await invalidate();
    },
  });

  const deleteDraft = trpc.instagram.deleteDraft.useMutation({
    onSuccess: async () => {
      setNotice("Draft deleted.");
      await invalidate();
    },
    onError: (error) => setNotice(error.message),
  });

  const connection = statusQuery.data?.connection;
  const drafts = draftsQuery.data ?? [];
  const currentType = useMemo(
    () => CONTENT_TYPES.find((item) => item.id === composer.contentType) ?? CONTENT_TYPES[0],
    [composer.contentType],
  );
  const isBusy = connect.isPending || disconnect.isPending || createDraft.isPending || publishDraft.isPending || deleteDraft.isPending;

  const set = <Key extends keyof ComposerState>(key: Key, value: ComposerState[Key]) => {
    setComposer((current) => ({ ...current, [key]: value }));
  };

  const handleSaveDraft = () => {
    setNotice(null);
    const carouselMediaUrls = composer.carouselUrls
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);

    createDraft.mutate({
      contentType: composer.contentType,
      caption: composer.caption.trim() || undefined,
      mediaUrl: composer.contentType === "CAROUSEL" ? undefined : composer.mediaUrl.trim() || undefined,
      carouselMediaUrls: composer.contentType === "CAROUSEL" ? carouselMediaUrls : undefined,
      altText: composer.altText.trim() || undefined,
      isAiGenerated: composer.isAiGenerated,
    });
  };

  const confirmDisconnect = () => {
    const execute = () => disconnect.mutate();
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Disconnect Instagram? The stored credential will be erased and publishing will be disabled.")) execute();
      return;
    }
    Alert.alert("Disconnect Instagram?", "The stored credential will be erased and publishing will be disabled.", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: execute },
    ]);
  };

  return (
    <ScreenContainer style={styles.safeArea}>
      <View style={styles.canvas}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>FOCUSPATH / CONTENT WORKSPACE</Text>
              <Text style={styles.title}>Publish with intent.</Text>
              <Text style={styles.subhead}>
                Connect your own professional account, prepare public media, and retain complete control over every post.
              </Text>
            </View>
            <View style={[styles.modePill, connection ? styles.modePillConnected : styles.modePillOffline]}>
              <View style={[styles.statusDot, connection ? styles.statusDotConnected : styles.statusDotOffline]} />
              <Text style={styles.modePillLabel}>{connection ? "MANUAL CONTROL" : "NOT CONNECTED"}</Text>
            </View>
          </View>

          {notice ? (
            <View style={styles.notice}>
              <IconSymbol name="checkmark.circle.fill" size={18} color="#B7AEFF" />
              <Text style={styles.noticeText}>{notice}</Text>
              <Pressable onPress={() => setNotice(null)} hitSlop={10} accessibilityLabel="Dismiss message">
                <Text style={styles.dismiss}>×</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>ACCOUNT CONNECTION</Text>
                <Text style={styles.sectionTitle}>Instagram professional account</Text>
              </View>
              {statusQuery.isLoading ? <ActivityIndicator color="#A79CFF" /> : null}
            </View>
            <View style={styles.connectionCard}>
              {connection ? (
                <>
                  <View style={styles.accountIdentity}>
                    <View style={styles.accountBadge}><Text style={styles.accountBadgeText}>IG</Text></View>
                    <View style={styles.accountCopy}>
                      <Text style={styles.accountName}>@{connection.username || "instagram"}</Text>
                      <Text style={styles.accountMeta}>
                        Token valid until {dateLabel(connection.expiresAt)}{connection.isExpiringSoon ? " · refresh due soon" : ""}
                      </Text>
                    </View>
                  </View>
                  <Pressable disabled={isBusy} onPress={confirmDisconnect} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, isBusy && styles.disabled]}>
                    <Text style={styles.secondaryButtonText}>Disconnect</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.accountCopy}>
                    <Text style={styles.accountName}>Connect before publishing</Text>
                    <Text style={styles.accountMeta}>
                      OAuth only. Instagram passwords and access tokens never enter the FocusPath client.
                    </Text>
                  </View>
                  <Pressable
                    disabled={isBusy || !statusQuery.data?.configured}
                    onPress={() => connect.mutate()}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (isBusy || !statusQuery.data?.configured) && styles.disabled]}
                  >
                    {connect.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{statusQuery.data?.configured ? "Connect Instagram" : "Integration needs setup"}</Text>}
                  </Pressable>
                </>
              )}
            </View>
            {!statusQuery.data?.configured ? (
              <Text style={styles.setupHint}>A server administrator must add the Meta app ID, app secret, callback URL, and encryption key before a connection can be authorized.</Text>
            ) : null}
          </View>

          <View style={[styles.section, !connection && styles.sectionDisabled]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>MANUAL COMPOSER</Text>
                <Text style={styles.sectionTitle}>Create a publishing draft</Text>
              </View>
              <Text style={styles.phaseTag}>PHASE 1</Text>
            </View>
            <Text style={styles.sectionCopy}>
              Your media must already be hosted at a public HTTPS URL when you publish. Save a draft first; publishing only begins after you press Publish on that draft.
            </Text>

            <View style={styles.typeRow} accessibilityRole="tablist">
              {CONTENT_TYPES.map((item) => {
                const active = item.id === composer.contentType;
                return (
                  <Pressable
                    key={item.id}
                    disabled={!connection || isBusy}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => set("contentType", item.id)}
                    style={({ pressed }) => [styles.typeButton, active && styles.typeButtonActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.typeButtonLabel, active && styles.typeButtonLabelActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.typeHelper}>{currentType.helper}</Text>

            {composer.contentType === "CAROUSEL" ? (
              <ComposerField
                label="Carousel media URLs"
                value={composer.carouselUrls}
                onChangeText={(value) => set("carouselUrls", value)}
                placeholder="https://cdn.example.com/slide-1.jpg\nhttps://cdn.example.com/slide-2.jpg"
                multiline
                helper="One URL per line or comma-separated. Use 2 to 10 files."
              />
            ) : (
              <ComposerField
                label="Public media URL"
                value={composer.mediaUrl}
                onChangeText={(value) => set("mediaUrl", value)}
                placeholder={composer.contentType === "IMAGE" ? "https://cdn.example.com/post.jpg" : "https://cdn.example.com/video.mp4"}
                helper="Instagram downloads this URL directly during publishing."
              />
            )}

            <ComposerField
              label={composer.contentType === "STORY" ? "Internal notes" : "Caption"}
              value={composer.caption}
              onChangeText={(value) => set("caption", value)}
              placeholder={composer.contentType === "STORY" ? "Notes for this story draft" : "Write the caption you want to publish"}
              multiline
              helper={composer.contentType === "STORY" ? "Stories do not use a feed caption in this flow." : "Keep claims precise and include only rights-cleared material."}
            />

            {composer.contentType === "IMAGE" ? (
              <ComposerField
                label="Alt text (optional)"
                value={composer.altText}
                onChangeText={(value) => set("altText", value)}
                placeholder="Describe the image for accessibility"
                helper="Used for image accessibility when supported by Instagram."
              />
            ) : null}

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>AI-generated media disclosure</Text>
                <Text style={styles.toggleHint}>Send Instagram’s AI disclosure flag with this media when applicable.</Text>
              </View>
              <Switch
                value={composer.isAiGenerated}
                disabled={!connection || isBusy}
                onValueChange={(value) => set("isAiGenerated", value)}
                trackColor={{ false: "#33445E", true: "#6C4CF5" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Pressable disabled={!connection || isBusy} onPress={handleSaveDraft} style={({ pressed }) => [styles.saveDraftButton, pressed && styles.pressed, (!connection || isBusy) && styles.disabled]}>
              {createDraft.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save manual draft</Text>}
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>PUBLISHING QUEUE</Text>
                <Text style={styles.sectionTitle}>Drafts and recent posts</Text>
              </View>
              <Text style={styles.countPill}>{drafts.length}</Text>
            </View>
            {draftsQuery.isLoading ? <ActivityIndicator color="#A79CFF" style={styles.loader} /> : null}
            {!draftsQuery.isLoading && !drafts.length ? (
              <View style={styles.emptyState}>
                <IconSymbol name="paperplane.fill" size={26} color="#7E72DC" />
                <Text style={styles.emptyTitle}>No publishing drafts yet</Text>
                <Text style={styles.emptyCopy}>Once connected, save a manual draft above. Nothing is published automatically in this phase.</Text>
              </View>
            ) : null}
            {drafts.map((draft) => (
              <View key={draft.id} style={styles.draftCard}>
                <View style={styles.draftHeading}>
                  <View>
                    <Text style={styles.draftType}>{draft.contentType}</Text>
                    <Text style={styles.draftTitle} numberOfLines={2}>{draft.caption || (draft.contentType === "STORY" ? "Story draft" : "Untitled post")}</Text>
                  </View>
                  <View style={[styles.statusPill, isPublished(draft.status) && styles.statusPillPublished, draft.status === "FAILED" && styles.statusPillFailed]}>
                    <Text style={[styles.statusPillText, isPublished(draft.status) && styles.statusPillTextPublished, draft.status === "FAILED" && styles.statusPillTextFailed]}>{draftStatusLabel(draft.status)}</Text>
                  </View>
                </View>
                <Text style={styles.draftMeta}>Updated {dateLabel(draft.updatedAt)} · {draft.contentType === "CAROUSEL" ? "Carousel" : draft.mediaUrl ? "Public media linked" : "Media missing"}</Text>
                {draft.lastError ? <Text style={styles.draftError}>{draft.lastError}</Text> : null}
                <View style={styles.draftActions}>
                  {!isPublished(draft.status) ? (
                    <Pressable
                      disabled={!connection || isBusy}
                      onPress={() => publishDraft.mutate({ id: draft.id })}
                      style={({ pressed }) => [styles.publishButton, pressed && styles.pressed, (!connection || isBusy) && styles.disabled]}
                    >
                      {publishDraft.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishButtonText}>{draft.status === "AWAITING_MEDIA" ? "Check & publish" : "Publish"}</Text>}
                    </Pressable>
                  ) : null}
                  {!isPublished(draft.status) ? (
                    <Pressable disabled={isBusy} onPress={() => deleteDraft.mutate({ id: draft.id })} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed, isBusy && styles.disabled]}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>FocusPath uses the official Instagram API only. Publishing is manual in this release; no content is sent without your action.</Text>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#0B1220" },
  canvas: { backgroundColor: "#0B1220", flex: 1, minHeight: "100%" },
  scrollContent: { paddingBottom: 118 },
  header: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 18, justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 30, paddingBottom: 22 },
  headerCopy: { flex: 1, minWidth: 240 },
  kicker: { color: "#A79CFF", fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 10 },
  title: { color: "#F8FAFC", fontSize: 30, fontWeight: "800", letterSpacing: -0.8, lineHeight: 36 },
  subhead: { color: "#94A3B8", fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 560 },
  modePill: { alignItems: "center", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 7, paddingHorizontal: 11, paddingVertical: 7 },
  modePillConnected: { backgroundColor: "#112A2B", borderColor: "#216163" },
  modePillOffline: { backgroundColor: "#1E2841", borderColor: "#354767" },
  statusDot: { borderRadius: 999, height: 7, width: 7 },
  statusDotConnected: { backgroundColor: "#38D9A9" },
  statusDotOffline: { backgroundColor: "#8A9AB5" },
  modePillLabel: { color: "#C9D5E7", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  notice: { alignItems: "center", backgroundColor: "rgba(108,76,245,0.15)", borderColor: "rgba(167,156,255,0.42)", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 10, marginHorizontal: 24, marginBottom: 18, paddingHorizontal: 14, paddingVertical: 12 },
  noticeText: { color: "#DCD8FF", flex: 1, fontSize: 13, lineHeight: 19 },
  dismiss: { color: "#B7AEFF", fontSize: 25, fontWeight: "300", lineHeight: 25 },
  section: { backgroundColor: "#101B2D", borderColor: "#263652", borderWidth: 1, marginHorizontal: 24, marginBottom: 16, padding: 20 },
  sectionDisabled: { opacity: 0.76 },
  sectionHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  sectionKicker: { color: "#8D83D9", fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 7 },
  sectionTitle: { color: "#F8FAFC", fontSize: 19, fontWeight: "800", letterSpacing: -0.35 },
  sectionCopy: { color: "#93A4BD", fontSize: 13, lineHeight: 20, marginTop: 11, maxWidth: 650 },
  phaseTag: { backgroundColor: "#1E2841", color: "#B7AEFF", fontSize: 10, fontWeight: "800", letterSpacing: 0.75, paddingHorizontal: 8, paddingVertical: 6 },
  connectionCard: { alignItems: "center", backgroundColor: "#0D1626", borderColor: "#263652", borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "space-between", marginTop: 17, padding: 16 },
  accountIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12, minWidth: 220 },
  accountBadge: { alignItems: "center", backgroundColor: "#6C4CF5", borderRadius: 10, height: 42, justifyContent: "center", width: 42 },
  accountBadgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  accountCopy: { flex: 1, minWidth: 200 },
  accountName: { color: "#EAF0F8", fontSize: 15, fontWeight: "800" },
  accountMeta: { color: "#8293AB", fontSize: 12, lineHeight: 18, marginTop: 4 },
  primaryButton: { alignItems: "center", backgroundColor: "#6C4CF5", justifyContent: "center", minHeight: 40, paddingHorizontal: 15, paddingVertical: 10 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  secondaryButton: { borderColor: "#435775", borderWidth: 1, minHeight: 40, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: "#C8D3E4", fontSize: 12, fontWeight: "800" },
  setupHint: { color: "#E9BC72", fontSize: 12, lineHeight: 18, marginTop: 11 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 19 },
  typeButton: { backgroundColor: "#17243A", borderColor: "#2D405E", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  typeButtonActive: { backgroundColor: "#6C4CF5", borderColor: "#8F7CFF" },
  typeButtonLabel: { color: "#A5B4C9", fontSize: 12, fontWeight: "800" },
  typeButtonLabelActive: { color: "#FFFFFF" },
  typeHelper: { color: "#8293AB", fontSize: 12, marginTop: 9 },
  fieldWrap: { marginTop: 18 },
  fieldLabel: { color: "#C9D5E7", fontSize: 12, fontWeight: "800", marginBottom: 8 },
  field: { backgroundColor: "#0C1524", borderColor: "#30415F", borderWidth: 1, color: "#F0F5FB", fontSize: 13, minHeight: 44, paddingHorizontal: 12, paddingVertical: 11 },
  fieldMultiline: { minHeight: 108, textAlignVertical: "top" },
  fieldHelper: { color: "#71829B", fontSize: 11, lineHeight: 16, marginTop: 6 },
  toggleRow: { alignItems: "center", backgroundColor: "#0D1626", borderColor: "#263652", borderWidth: 1, flexDirection: "row", gap: 15, justifyContent: "space-between", marginTop: 18, padding: 14 },
  toggleCopy: { flex: 1 },
  toggleLabel: { color: "#DFE8F3", fontSize: 13, fontWeight: "800" },
  toggleHint: { color: "#8293AB", fontSize: 11, lineHeight: 16, marginTop: 4 },
  saveDraftButton: { alignItems: "center", backgroundColor: "#6C4CF5", justifyContent: "center", marginTop: 20, minHeight: 46, paddingHorizontal: 16, paddingVertical: 11 },
  countPill: { backgroundColor: "#1E2841", color: "#B7AEFF", fontSize: 12, fontVariant: ["tabular-nums"], fontWeight: "800", minWidth: 28, paddingHorizontal: 9, paddingVertical: 6, textAlign: "center" },
  loader: { marginVertical: 28 },
  emptyState: { alignItems: "center", backgroundColor: "#0D1626", borderColor: "#263652", borderWidth: 1, marginTop: 18, minHeight: 180, justifyContent: "center", paddingHorizontal: 28 },
  emptyTitle: { color: "#E6EEF8", fontSize: 14, fontWeight: "800", marginTop: 12 },
  emptyCopy: { color: "#8293AB", fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 300, textAlign: "center" },
  draftCard: { backgroundColor: "#0D1626", borderColor: "#263652", borderWidth: 1, marginTop: 12, padding: 16 },
  draftHeading: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  draftType: { color: "#8D83D9", fontSize: 10, fontWeight: "900", letterSpacing: 1.05, marginBottom: 6 },
  draftTitle: { color: "#EDF3FB", fontSize: 14, fontWeight: "800", lineHeight: 20, maxWidth: 450 },
  statusPill: { backgroundColor: "#263750", paddingHorizontal: 8, paddingVertical: 5 },
  statusPillPublished: { backgroundColor: "rgba(56,217,169,0.16)" },
  statusPillFailed: { backgroundColor: "rgba(255,122,158,0.16)" },
  statusPillText: { color: "#B8C6D9", fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  statusPillTextPublished: { color: "#66E1BB" },
  statusPillTextFailed: { color: "#FF9AB5" },
  draftMeta: { color: "#8293AB", fontSize: 11, lineHeight: 16, marginTop: 10 },
  draftError: { color: "#FF9AB5", fontSize: 12, lineHeight: 18, marginTop: 9 },
  draftActions: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 14 },
  publishButton: { alignItems: "center", backgroundColor: "#6C4CF5", justifyContent: "center", minHeight: 38, paddingHorizontal: 13, paddingVertical: 9 },
  publishButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  deleteButton: { borderColor: "#435775", borderWidth: 1, minHeight: 38, paddingHorizontal: 13, paddingVertical: 9 },
  deleteButtonText: { color: "#B6C3D5", fontSize: 12, fontWeight: "800" },
  footer: { color: "#667A96", fontSize: 12, lineHeight: 18, paddingHorizontal: 24, paddingTop: 4 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
});
