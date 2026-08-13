import { z } from "zod";
import { buildInstagramAuthorizationUrl } from "./_core/instagramClient";
import { instagramIsConfigured } from "./_core/instagramConfig";
import { createInstagramOAuthState } from "./_core/instagramSecurity";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createInstagramDraft,
  deleteInstagramDraft,
  disconnectInstagram,
  getInstagramConnectionSummary,
  listInstagramDrafts,
  publishInstagramDraft,
  updateInstagramDraft,
} from "./instagramService";

const contentType = z.enum(["IMAGE", "REEL", "STORY", "CAROUSEL"]);
const url = z
  .string()
  .url()
  .max(2048)
  .refine((value) => value.startsWith("https://"), "Use a publicly accessible HTTPS URL.");
const optionalText = z.string().max(2200).optional();

const draftInput = z.object({
  contentType,
  caption: optionalText,
  mediaUrl: url.optional(),
  carouselMediaUrls: z.array(url).min(2).max(10).optional(),
  altText: z.string().max(1000).optional(),
  isAiGenerated: z.boolean().optional(),
});

export const instagramRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => ({
    configured: instagramIsConfigured(),
    connection: await getInstagramConnectionSummary(ctx.user.id),
  })),

  beginConnection: protectedProcedure.mutation(({ ctx }) => {
    if (!instagramIsConfigured()) {
      throw new Error("Instagram is not configured yet. Add the server-side Meta credentials first.");
    }
    const state = createInstagramOAuthState(ctx.user.id);
    return { authorizationUrl: buildInstagramAuthorizationUrl(state) };
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await disconnectInstagram(ctx.user.id);
    return { success: true };
  }),

  listDrafts: protectedProcedure.query(({ ctx }) => listInstagramDrafts(ctx.user.id)),

  createDraft: protectedProcedure.input(draftInput).mutation(async ({ ctx, input }) => {
    const id = await createInstagramDraft(ctx.user.id, input);
    return { id };
  }),

  updateDraft: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), changes: draftInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      await updateInstagramDraft(ctx.user.id, input.id, input.changes);
      return { success: true };
    }),

  deleteDraft: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await deleteInstagramDraft(ctx.user.id, input.id);
    return { success: true };
  }),

  publishDraft: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) =>
    publishInstagramDraft(ctx.user.id, input.id),
  ),
});
