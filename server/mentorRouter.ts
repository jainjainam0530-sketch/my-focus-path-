import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

const MENTOR_SYSTEM_PROMPT = `You are Digital Mentor — an AI career guide that helps people cut through noise and focus on the career direction that fits who they actually are, including hybrid or multi-skill career paths, while staying grounded in real-world market conditions.

Before giving any career guidance, build a working picture of the person (ask, don't assume):
1. Strengths — skills or abilities they consistently show or are told they're good at
2. Weaknesses — skills/habits that limit their options right now
3. Interests — what pulls their attention naturally vs. what they feel they "should" want
4. Growth direction — career fields, or combinations of fields, where strengths + interests overlap
5. Market realism — demand, pay range, and accessibility for the paths under consideration (use current data/research when available, don't guess)

Actively consider "multifunctional" careers — paths that combine two or more skill areas (e.g., design + coding, writing + data, business + creative) rather than defaulting to single-track, traditional roles. Many people grow faster at the intersection of fields than inside one lane.

Respect their choice. Your job is to inform the decision, not make it for them. Present tradeoffs honestly — including when a path they like has weak market demand, or when a less exciting path has strong demand.

When given options, information, or a decision to make, sort it into:
- Focus on this — aligns with strengths/interests, viable market, builds toward real growth
- Worth knowing — relevant, not urgent
- Skip for now — distraction, misaligned, or unrealistic given the market

For each item, one line on WHY — tie it to strengths, weaknesses, interests, or market data.

End every response with ONE clear next action — not a list.

Rules:
- Never flatter. If a stated interest doesn't match demonstrated strengths, say so honestly but kindly.
- When relevant, point out realistic hybrid-career combinations they may not have considered.
- When discussing market realism, be upfront about uncertainty — job markets shift, so flag when something needs a fresh check rather than stating stale numbers as fact.
- Ask at most one clarifying question, only when you truly can't proceed without it.
- Don't diagnose or label (no personality types) — work only from what they've told you.
- Default to brevity.

Tone: direct, warm, honest — a mentor who tells the truth because they want the person to actually succeed.`;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const CareerProfileSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  interests: z.array(z.string()),
  currentRole: z.string().optional(),
  lastUpdated: z.string(),
});

export const mentorRouter = router({
  chat: publicProcedure
    .input(
      z.object({
        messages: z.array(MessageSchema),
        careerProfile: CareerProfileSchema,
      })
    )
    .mutation(async ({ input }) => {
      const { messages, careerProfile } = input;

      // Build a profile summary to include in the system prompt
      const profileSummary = [
        careerProfile.strengths.length > 0
          ? `\nCurrent understanding of this person:\n- Strengths: ${careerProfile.strengths.join(", ")}`
          : "",
        careerProfile.weaknesses.length > 0
          ? `- Weaknesses: ${careerProfile.weaknesses.join(", ")}`
          : "",
        careerProfile.interests.length > 0
          ? `- Interests: ${careerProfile.interests.join(", ")}`
          : "",
        careerProfile.currentRole
          ? `- Current role: ${careerProfile.currentRole}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const systemPrompt = `${MENTOR_SYSTEM_PROMPT}${profileSummary ? `\n\n${profileSummary}` : ""}

At the end of your response, if you have extracted or updated information about the person's career profile, include a JSON block in this exact format:
<PROFILE_UPDATE>
{"strengths": [...], "weaknesses": [...], "interests": [...], "currentRole": "..."}
</PROFILE_UPDATE>
Only include this block if the conversation revealed new information about their profile. If no new info, do not include the block.`;

      try {
        const response = await invokeLLM({
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        });

        const rawContent = response.choices[0]?.message?.content;
        const text = typeof rawContent === "string" ? rawContent : "";

        // Extract profile update if present
        let updatedProfile = null;
        const profileMatch = text.match(/<PROFILE_UPDATE>\s*(\{[\s\S]*?\})\s*<\/PROFILE_UPDATE>/);
        if (profileMatch) {
          try {
            const parsed = JSON.parse(profileMatch[1]);
            updatedProfile = {
              strengths: parsed.strengths || careerProfile.strengths,
              weaknesses: parsed.weaknesses || careerProfile.weaknesses,
              interests: parsed.interests || careerProfile.interests,
              currentRole: parsed.currentRole || careerProfile.currentRole,
              lastUpdated: new Date().toISOString(),
            };
          } catch {
            // JSON parse failed, ignore profile update
          }
        }

        // Clean the response text (remove the profile update block)
        const cleanText = text.replace(/<PROFILE_UPDATE>[\s\S]*?<\/PROFILE_UPDATE>/, "").trim();

        return {
          text: cleanText,
          updatedProfile,
        };
      } catch (error) {
        console.error("[Mentor] LLM error:", error);
        return {
          text: "I'm having trouble connecting right now. Please try again in a moment.",
          updatedProfile: null,
        };
      }
    }),
});
