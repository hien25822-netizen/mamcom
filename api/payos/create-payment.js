// Vercel Serverless Function: Tạo yêu cầu thanh toán VietQR PRO qua PayOS
import crypto from "crypto";

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

  const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
  const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
  const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

  if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
    return res.status(500).json({ error: "Chưa cấu hình thông tin PayOS trong Environment Variables" });
  }

  try {
    const { orderId, amount, description } = req.body || {};

    const cleanAmount = Math.round(Number(amount)) || 0;
    if (!cleanAmount || cleanAmount < 1000) {
      return res.status(400).json({ error: "Số tiền thanh toán không hợp lệ" });
    }
    // Lấy mã số đơn hàng (dạng số nguyên)
    let numericOrderCode = Number(String(orderId || "").replace(/\D/g, ""));
    if (!numericOrderCode || numericOrderCode <= 0) {
      numericOrderCode = Number(Date.now().toString().slice(-8));
    }

    let desc = String(description || ("MC" + numericOrderCode))
      .replace(/[^A-Za-z0-9 ]/g, "")
      .trim()
      .slice(0, 25) || ("MC" + numericOrderCode);
    const cancelUrl = "https://mamcomvn.vercel.app";
    const returnUrl = "https://mamcomvn.vercel.app";

    function makePayload(code, orderDesc) {
      const rawData = [
        `amount=${cleanAmount}`,
        `cancelUrl=${cancelUrl}`,
        `description=${orderDesc}`,
        `orderCode=${code}`,
        `returnUrl=${returnUrl}`
      ].join("&");

      const signature = crypto
        .createHmac("sha256", PAYOS_CHECKSUM_KEY)
        .update(rawData)
        .digest("hex");

      return {
        orderCode: code,
        amount: cleanAmount,
        description: orderDesc,
        cancelUrl,
        returnUrl,
        signature
      };
    }

    let payosPayload = makePayload(numericOrderCode, desc);

    let payosRes = await fetch("https://api-merchant.payos.vn/v2/payment-requests", {
      method: "POST",
      headers: {
        "x-client-id": PAYOS_CLIENT_ID,
        "x-api-key": PAYOS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payosPayload)
    });

    let data = await payosRes.json();

    // Nếu mã đơn đã tồn tại (code 231), sinh mã mới theo timestamp và thử lại
    if (data.code === "231" || data.code === 231) {
      numericOrderCode = Number(Date.now().toString().slice(-8));
      desc = "MC" + numericOrderCode;
      payosPayload = makePayload(numericOrderCode, desc);
      payosRes = await fetch("https://api-merchant.payos.vn/v2/payment-requests", {
        method: "POST",
        headers: {
          "x-client-id": PAYOS_CLIENT_ID,
          "x-api-key": PAYOS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payosPayload)
      });
      data = await payosRes.json();
    }

    if (data.code !== "00" && data.code !== 0) {
      return res.status(400).json({ error: data.desc || "Lỗi tạo link thanh toán PayOS", details: data });
    }

    return res.status(200).json({
      success: true,
      orderCode: numericOrderCode,
      orderId: "MC" + numericOrderCode,
      amount: cleanAmount,
      description: data.data.description || desc,
      accountNumber: data.data.accountNumber,
      accountName: data.data.accountName,
      bin: data.data.bin || "970422",
      qrCode: data.data.qrCode,
      checkoutUrl: data.data.checkoutUrl,
      paymentLinkId: data.data.paymentLinkId
    });
  } catch (err) {
    console.error("[PayOS Create Error]:", err);
    return res.status(500).json({ error: err.message });
  }
}
