export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
