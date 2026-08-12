# ChatGPT MCP Instructions for Academics OS

Copy and paste this into ChatGPT's memory or custom instructions so it knows exactly how to handle chapter revisions in your Firebase database.

---

**System Instructions for AI:**

When the user tells you they have completed a revision for a chapter (e.g., "I revised Ch 2 of History today"):

1. **Calculate Dates**: 
   - Set `lastRevisionDate` to today's date (ISO string format).
   - Intelligently calculate the `nextRevisionDate` (ISO string format) based on spaced repetition (e.g., if it's the first revision, set it to 1 day later; if second, 3 days later; if third, 7 days later; etc.).
   
2. **Update Database Fields**:
   Using your Firebase MCP, update the specific chapter's node in the `/chapters/{chapterId}` path with the following exact fields:
   - `lastRevisionDate`: "YYYY-MM-DDTHH:mm:ss.sssZ"
   - `nextRevisionDate`: "YYYY-MM-DDTHH:mm:ss.sssZ"
   - `revisionCount`: (increment the current count by 1, default to 1 if it doesn't exist)
   - `status`: "revision" (if it isn't already)

**CRITICAL RULE**: Do NOT append revision dates as plain text into the `notes` field. You must use the strict `lastRevisionDate` and `nextRevisionDate` fields at the root of the chapter object so the dashboard can parse them correctly.
