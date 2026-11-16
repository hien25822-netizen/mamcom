// Vercel Serverless Function: Gửi tin nhắn Telegram từ máy chủ quốc tế (Vượt qua tường lửa chặn Telegram tại VN)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Đọc Bot Token và Chat ID từ Biến Môi Trường Vercel (bảo mật tuyệt đối, chống lộ secrets)
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "5756916605";

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN is not configured in environment variables");
    return res.status(500).json({ error: "Chưa cấu hình TELEGRAM_BOT_TOKEN trong Environment Variables" });
  }

  const { text, reply_markup } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "HTML",
        reply_markup: reply_markup || undefined
      })
    });

    const data = await tgRes.json();
    return res.status(tgRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
