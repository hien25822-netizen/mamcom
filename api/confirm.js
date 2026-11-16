// Vercel Serverless Function: Xác nhận đơn hàng đã nhận tiền
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Thiếu mã đơn hàng (id)");
  }

  const cleanId = String(id).trim().toUpperCase();
  const SUPABASE_URL = "https://sdlpldhldyyytkbpujdk.supabase.co";
  const SUPABASE_KEY = "sb_publishable_9-Z47h5jf1Dtj2ZJ-RslwA_RjL1rz9_";
  const TELEGRAM_BOT_TOKEN = "9112279625:AAE6_UXT0UjOq-Q7Nw-r2YnM5IV_Mj24bYg";
  const TELEGRAM_CHAT_ID = "5756916605";

  try {
    // 1. Gọi RPC confirm_order_payment trong Supabase (Atomic & Security Definer)
    const confRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirm_order_payment`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_order_id: cleanId })
    });

    if (!confRes.ok) {
      const errText = await confRes.text();
      return res.status(500).send(`Lỗi cập nhật đơn: ${errText}`);
    }

    // 2. Gửi tin nhắn xác nhận qua Telegram
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `🎉 <b>CHỦ QUÁN ĐÃ XÁC NHẬN NHẬN TIỀN THÀNH CÔNG!</b>\n━━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Mã đơn:</b> <code>${cleanId}</code>\n⚡ Màn hình của khách đã tự động hoàn tất và số mâm đã được cộng vào hệ thống.`,
          parse_mode: "HTML"
        })
      });
    } catch(e) {}

    // 3. Trả về trang thông báo xác nhận thành công cho chủ quán
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận thanh toán - Mâm Cơm</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fffbeb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; color: #1f2937; }
          .card { background: #ffffff; border-radius: 20px; padding: 32px 24px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1.5px solid #fef3c7; }
          .icon { width: 68px; height: 68px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 34px; margin: 0 auto 18px; border: 2.5px solid #a7f3d0; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2); }
          h2 { color: #111827; margin: 0 0 10px; font-size: 21px; font-weight: 800; }
          p { color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
          .badge { display: inline-block; background: #fef2f2; color: #ce2626; padding: 6px 14px; border-radius: 8px; font-family: monospace; font-size: 16px; font-weight: 700; border: 1px solid #fee2e2; margin-bottom: 16px; }
          .footer { font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h2>Đã xác nhận đơn hàng!</h2>
          <div class="badge">${cleanId}</div>
          <p>Màn hình của khách hàng trên trang web đã được <b>tự động chuyển sang "Thanh toán thành công"</b> và số mâm đã được cộng vào hệ thống.</p>
          <div class="footer">Mâm Cơm VN • Bếp Sơ Chế Mealkit</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`Lỗi hệ thống: ${err.message}`);
  }
}
