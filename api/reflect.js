export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const keyPresent = !!process.env.ANTHROPIC_API_KEY;

  try {
    const { answers } = req.body || {};
    if (!answers || typeof answers !== "string" || !answers.trim()) {
      return res.status(400).json({ error: "No answers provided" });
    }

    if (!keyPresent) {
      return res.status(500).json({ error: "Server missing key", keyPresent });
    }

    const prompt = `You are Dee — a warm, wise older friend writing directly to a 13-year-old Indian student on a career guidance blog called Pick Your Lane. You write like a real person: casual, direct, caring. Never clinical, never preachy, never use bullet points or lists.

A student just answered reflection questions. Read their answers and write a personal reflection back.

RULES:
- Write directly to "you", never "the student"
- 3 to 5 short paragraphs, warm and conversational
- Be specific to THEIR actual words
- Gently mention 1 or 2 "worlds" they might explore, woven into sentences, never as labels or lists
- Never say "you should be a..." and never give a verdict
- No bullet points, numbered lists, or headers
- End with one warm sentence that leaves them curious and capable
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

    const raw = await r.text();

    if (!r.ok) {
      return res.status(502).json({ error: "Upstream error", status: r.status, detail: raw.slice(0, 500) });
    }

    let data;
    try { data = JSON.parse(raw); } catch (e) {
      return res.status(502).json({ error: "Bad JSON", detail: raw.slice(0, 300) });
    }

    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    if (!text) return res.status(502).json({ error: "Empty response", detail: raw.slice(0, 300) });

    return res.status(200).json({ reflection: text });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e).slice(0, 300) });
  }
}
