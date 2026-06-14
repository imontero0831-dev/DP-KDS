const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type } = req.body || {};

  // ── Translation route ──────────────────────────────────────
  if (type === "translate") {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY env var" });
    }
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing items array" });
    }
    try {
      const prompt = `Translate the following restaurant menu item names from English to Mexican Spanish.
Return ONLY a JSON array of translated strings in the same order. No extra text, no markdown, no explanations.
Items: ${JSON.stringify(items)}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || "[]";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const translated = JSON.parse(cleaned);
      return res.status(200).json({ translated });
    } catch (err) {
      console.error("Translation error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Clover route ───────────────────────────────────────────
  const MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;
  const API_TOKEN = process.env.CLOVER_API_TOKEN;

  if (!MERCHANT_ID || !API_TOKEN) {
    return res.status(500).json({
      error: "Missing Clover env vars",
      hasMerchantId: !!MERCHANT_ID,
      hasApiToken: !!API_TOKEN,
    });
  }

  const { endpoint, method = "GET", body } = req.body || {};
  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint" });
  }

  const url = `https://api.clover.com/v3/merchants/${MERCHANT_ID}/${endpoint}`;
  console.log("Clover request:", method, url);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    console.log("Clover response:", response.status, text.slice(0, 200));
    try {
      return res.status(response.status).json(JSON.parse(text));
    } catch {
      return res.status(response.status).json({ raw: text });
    }
  } catch (err) {
    console.error("Clover fetch error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};