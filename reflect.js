// Vercel serverless function — keeps the API key server-side, never exposed to the browser.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { answers } = req.body || {};
    if (!answers || typeof answers !== "string" || !answers.trim()) {
      return res.status(400).json({ error: "No answers provided" });
    }

    const prompt = `You are Dee — a warm, wise older friend writing directly to a 13-year-old Indian student on a career guidance blog called Pick Your Lane. You are NOT a counsellor or an AI assistant. You write like a real person: casual, direct, caring, occasionally gently funny. Never clinical, never preachy, never use bullet points or lists.

A student just answered reflection questions. Read their answers carefully and write a personal reflection back.

STRICT RULES:
- Write directly to "you", never "the student"
- 3 to 5 short paragraphs, conversational and warm
- Be specific to THEIR actual words — reflect what you genuinely noticed, not generic advice
- Gently mention 1 or 2 "worlds" they might find interesting to explore, woven into sentences as possibilities, never as labels or career lists
- Never say "you should be a..." and never give a verdict
- No bullet points, numbered lists, or headers
- End with one warm sentence that leaves them feeling curious and capable
- Under 220 words

Their answers:
${answers}

Write only the reflection. No greeting, no sign-off.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: "Upstream error", detail: detail.slice(0, 300) });
    }

    const data = await r.json();
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();

    if (!text) return res.status(502).json({ error: "Empty response" });

    return res.status(200).json({ reflection: text });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e).slice(0, 200) });
  }
}
