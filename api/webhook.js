// Vercel Serverless Function: Webhook nhận biến động số dư từ PayOS (MB Bank VietQR PRO) / SePay / Casso
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ chấp nhận phương thức POST" });
  }

  const SUPABASE_URL = "https://sdlpldhldyyytkbpujdk.supabase.co";
  const SUPABASE_KEY = "sb_publishable_9-Z47h5jf1Dtj2ZJ-RslwA_RjL1rz9_";
  
  // Đọc Bot Token và Chat ID từ Biến Môi Trường Vercel
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "5756916605";

  try {
    const payload = req.body || {};
    let orderId = "";
    let transferAmount = 0;

    // 1. Bóc tách mã đơn từ PayOS webhook data
    if (payload.data && payload.data.orderCode) {
      orderId = "MC" + payload.data.orderCode;
    }

    // 2. Quét regex nếu chưa thấy
    if (!orderId) {
      const rawText = JSON.stringify(payload);
      const match = rawText.match(/MC\d+/i);
      if (match) {
        orderId = match[0].toUpperCase();
      }
    }

    // 3. Số tiền giao dịch
    if (payload.data && payload.data.amount) {
      transferAmount = Number(payload.data.amount) || 0;
    } else if (payload.transferAmount) {
      transferAmount = Number(payload.transferAmount) || 0;
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
      if (TELEGRAM_BOT_TOKEN) {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: `🎉 <b>KHÁCH HÀNG ĐÃ THANH TOÁN THÀNH CÔNG!</b>\n━━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Mã đơn:</b> <code>${orderId}</code>\n💰 <b>Số tiền:</b> ${transferAmount ? transferAmount.toLocaleString("vi-VN") + " ₫" : "Đã đối soát khớp"}\n🏦 <b>Ngân hàng:</b> MB Bank (VietQR PRO - PayOS)\n⚡ Màn hình khách đã tự động hoàn tất và số mâm đã được cộng vào hệ thống.`,
              parse_mode: "HTML"
            })
          });
        } catch(e) {}
      }

      console.log(`[PayOS Webhook] Đã tự động xác nhận đơn hàng: ${orderId}`);
    }

    // Luôn trả về HTTP 200 cho PayOS
    return res.status(200).json({ success: true, orderId: orderId || null });
  } catch (err) {
    console.error("[Webhook Error]:", err);
    return res.status(500).json({ error: err.message });
  }
}
