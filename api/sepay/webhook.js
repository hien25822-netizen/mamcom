// Vercel Serverless Function: Webhook SePay liên kết trực tiếp MB Bank 2258228668 (đối soát tự động theo nội dung MC...)
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ chấp nhận phương thức POST" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sdlpldhldyyytkbpujdk.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_9-Z47h5jf1Dtj2ZJ-RslwA_RjL1rz9_";
  const SEPAY_API_KEY = process.env.SEPAY_API_KEY;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "5756916605";

  // Xác thực SePay API Key nếu đã cấu hình SEPAY_API_KEY trong Vercel Environment Variables
  if (SEPAY_API_KEY) {
    const authHeader = String(req.headers.authorization || req.headers["x-api-key"] || "").trim();
    const expected = `Apikey ${SEPAY_API_KEY}`;
    if (authHeader !== expected && authHeader !== SEPAY_API_KEY) {
      return res.status(401).json({ success: false, error: "Invalid SePay API Key" });
    }
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    // SePay gửi transferType: "in" cho tiền vào, "out" cho tiền ra
    if (payload.transferType && String(payload.transferType).toLowerCase() !== "in") {
      return res.status(200).json({ success: true, ignored: true, reason: "not_incoming_transfer" });
    }

    const searchText = [
      payload.code,
      payload.content,
      payload.description,
      payload.referenceCode
    ]
      .filter(Boolean)
      .join(" ");

    const match = searchText.match(/MC\d{4,}/i);
    const orderId = match ? match[0].toUpperCase() : "";
    const transferAmount = Number(payload.transferAmount || payload.amount || 0) || 0;

    if (!orderId) {
      return res.status(200).json({ success: true, ignored: true, reason: "no_mc_order_code" });
    }

    // Kiểm tra idempotent tránh cộng dồn số mâm nếu SePay retry webhook
    let alreadyConfirmed = false;
    try {
      const stRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_order_status`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_order_id: orderId })
      });
      if (stRes.ok) {
        const curStatus = await stRes.json();
        if (curStatus === "confirmed" || curStatus === "done") {
          alreadyConfirmed = true;
        }
      }
    } catch (e) {}

    if (!alreadyConfirmed) {
      const confRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirm_order_payment`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_order_id: orderId })
      });
      if (!confRes.ok) {
        const errText = await confRes.text();
        return res.status(500).json({ success: false, error: errText });
      }

      if (TELEGRAM_BOT_TOKEN) {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: `🎉 <b>KHÁCH HÀNG ĐÃ THANH TOÁN THÀNH CÔNG!</b>\n━━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Mã đơn:</b> <code>${orderId}</code>\n💰 <b>Số tiền:</b> ${transferAmount ? transferAmount.toLocaleString("vi-VN") + " ₫" : "Đã đối soát khớp"}\n🏦 <b>Ngân hàng:</b> MB Bank <code>${payload.accountNumber || "2258228668"}</code> (SePay)\n⚡ Màn hình khách đã tự động hoàn tất và số mâm đã được cộng vào hệ thống.`,
              parse_mode: "HTML"
            })
          });
        } catch (e) {}
      }
    }

    return res.status(200).json({
      success: true,
      orderId,
      alreadyConfirmed
    });
  } catch (err) {
    console.error("[SePay Webhook Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
