cat > /Users/israel/restaurant-kds/api/clover.js << 'EOF'
export default async function handler(req, res) {
  const MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;
  const API_TOKEN = process.env.CLOVER_API_TOKEN;

  const { endpoint, method = "GET", body } = req.body || {};

  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
  if (!MERCHANT_ID || !API_TOKEN) return res.status(500).json({ error: "Missing Clover env vars" });

  try {
    const response = await fetch(
      `https://api.clover.com/v3/merchants/${MERCHANT_ID}/${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }
    );
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
EOF
