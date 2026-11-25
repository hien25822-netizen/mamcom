// Vercel Serverless Function: Kiểm tra trạng thái đơn trực tiếp từ PayOS API & đồng bộ Supabase (chống treo đơn nếu webhook trễ)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawId = String((req.query && (req.query.orderId || req.query.orderCode)) || "").trim();
  const numericOrderCode = Number(rawId.replace(/\D/g, ""));
  if (!numericOrderCode || numericOrderCode <= 0) {
    return res.status(400).json({ error: "Thiếu orderId/orderCode hợp lệ" });
  }

  const cleanOrderId = "MC" + numericOrderCode;
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sdlpldhldyyytkbpujdk.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_9-Z47h5jf1Dtj2ZJ-RslwA_RjL1rz9_";
  const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
  const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "5756916605";

  try {
    // 1. Kiểm tra Supabase trước (nhanh nhất)
    let curStatus = null;
    try {
      const stRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_order_status`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_order_id: cleanOrderId })
      });
      if (stRes.ok) {
        curStatus = await stRes.json();
        if (curStatus === "confirmed" || curStatus === "done") {
          return res.status(200).json({ success: true, orderId: cleanOrderId, status: "confirmed", source: "supabase" });
        }
      }
    } catch (e) {}

    if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY) {
      return res.status(200).json({ success: true, orderId: cleanOrderId, status: curStatus || "pending", source: "supabase_only" });
    }

    // 2. Hỏi trực tiếp PayOS trạng thái thanh toán của orderCode
    const payosRes = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${numericOrderCode}`, {
      method: "GET",
      headers: {
        "x-client-id": PAYOS_CLIENT_ID,
        "x-api-key": PAYOS_API_KEY
      }
    });

    if (!payosRes.ok) {
      return res.status(200).json({ success: true, orderId: cleanOrderId, status: curStatus || "pending", source: "payos_unavailable" });
    }

    const pData = await payosRes.json();
    const pStatus = pData && pData.data && pData.data.status;

    if (pStatus === "PAID") {
      const paidAmount = Number(pData.data.amountPaid || pData.data.amount || 0);
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirm_order_payment`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_order_id: cleanOrderId })
      });

      if (TELEGRAM_BOT_TOKEN) {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: `🎉 <b>KHÁCH HÀNG ĐÃ THANH TOÁN THÀNH CÔNG!</b>\n━━━━━━━━━━━━━━━━━━━━━\n🆔 <b>Mã đơn:</b> <code>${cleanOrderId}</code>\n💰 <b>Số tiền:</b> ${paidAmount ? paidAmount.toLocaleString("vi-VN") + " ₫" : "Đã đối soát khớp"}\n🏦 <b>Ngân hàng:</b> MB Bank (VietQR PRO - PayOS)\n⚡ Hệ thống tự động đối soát trực tiếp từ PayOS và đã cập nhật đơn.`,
              parse_mode: "HTML"
            })
          });
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        orderId: cleanOrderId,
        status: "confirmed",
        payosStatus: pStatus,
        source: "payos_api"
      });
    }

    return res.status(200).json({
      success: true,
      orderId: cleanOrderId,
      status: curStatus || "pending",
      payosStatus: pStatus || "PENDING",
      source: "payos_api"
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
