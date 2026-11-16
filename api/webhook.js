// Vercel Serverless Function: Webhook nhận biến động số dư từ PayOS / Casso / Ngân hàng
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ chấp nhận phương thức POST" });
  }

  const SUPABASE_URL = "https://sdlpldhldyyytkbpujdk.supabase.co";
  const SUPABASE_KEY = "sb_publishable_9-Z47h5jf1Dtj2ZJ-RslwA_RjL1rz9_";
  const TELEGRAM_BOT_TOKEN = "9112279625:AAE6_UXT0UjOq-Q7Nw-r2YnM5IV_Mj24bYg";
  const TELEGRAM_CHAT_ID = "5756916605";

  try {
    const payload = req.body || {};
    let orderId = "";

    // 1. PayOS webhook: payload.data.description hoặc payload.data.orderCode
    if (payload.data) {
      const desc = String(payload.data.description || "");
      const match = desc.match(/MC\d{6}/i);
      if (match) {
        orderId = match[0].toUpperCase();
      } else if (payload.data.orderCode) {
        orderId = String(payload.data.orderCode).toUpperCase();
      }
    }

    // 2. Casso webhook: payload.data[i].description
    if (!orderId && Array.isArray(payload.data)) {
      for (const item of payload.data) {
        const desc = String(item.description || "");
        const match = desc.match(/MC\d{6}/i);
        if (match) {
          orderId = match[0].toUpperCase();
          break;
        }
      }
    }

    // 3. Direct payload: { orderId: "MC123456" }
    if (!orderId && payload.orderId) {
      orderId = String(payload.orderId).trim().toUpperCase();
    }

    if (orderId) {
      // Cập nhật trạng thái đơn thành confirmed trong Supabase qua RPC
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirm_order_payment`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_order_id: orderId })
      });

      // Bắn thông báo Telegram
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `🎉 <b>CỔNG THANH TOÁN TỰ ĐỘNG BÁO: ĐÃ NHẬN TIỀN!</b>\n━━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Mã đơn:</b> <code>${orderId}</code>\n⚡ Màn hình của khách đã tự động hoàn tất.`,
            parse_mode: "HTML"
          })
        });
      } catch(e) {}

      console.log(`[Webhook] Đã tự động xác nhận đơn hàng: ${orderId}`);
    }

    // Trả về HTTP 200 cho cổng thanh toán
    return res.status(200).json({ success: true, orderId: orderId || null });
  } catch (err) {
    console.error("[Webhook Error]:", err);
    return res.status(500).json({ error: err.message });
  }
}
