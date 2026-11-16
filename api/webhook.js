// Vercel Serverless Function: Webhook nhận biến động số dư từ SePay / PayOS / Casso / Ngân hàng Vietcombank
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
    let transferAmount = 0;

    // Chuyển toàn bộ payload thành text để quét mã đơn MCxxxxxx
    const rawText = JSON.stringify(payload);
    const match = rawText.match(/MC\d{6}/i);
    if (match) {
      orderId = match[0].toUpperCase();
    }

    // 1. Định dạng SePay: payload.content hoặc payload.description
    if (payload.transferAmount) {
      transferAmount = Number(payload.transferAmount) || 0;
    } else if (payload.data && payload.data.amount) {
      transferAmount = Number(payload.data.amount) || 0;
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

      // Bắn thông báo Telegram tự động
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `🎉 <b>HỆ THỐNG NGÂN HÀNG ĐÃ NHẬN TIỀN TỰ ĐỘNG!</b>\n━━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Mã đơn:</b> <code>${orderId}</code>\n💰 <b>Số tiền:</b> ${transferAmount ? transferAmount.toLocaleString("vi-VN") + " ₫" : "Đã đối soát khớp"}\n⚡ Màn hình khách đã tự động hoàn tất và số mâm đã được cộng.`,
            parse_mode: "HTML"
          })
        });
      } catch(e) {}

      console.log(`[Webhook] Đã tự động xác nhận đơn hàng: ${orderId}`);
    }

    // Luôn trả về HTTP 200 cho cổng thanh toán / ngân hàng
    return res.status(200).json({ success: true, orderId: orderId || null });
  } catch (err) {
    console.error("[Webhook Error]:", err);
    return res.status(500).json({ error: err.message });
  }
}
