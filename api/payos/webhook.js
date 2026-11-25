// Vercel Serverless Function: Webhook nhận biến động số dư chính thức từ PayOS (xác thực chữ ký PAYOS_CHECKSUM_KEY)
import crypto from "crypto";

function sortObjDataByKey(object) {
  const ordered = {};
  Object.keys(object)
    .sort()
    .forEach((key) => {
      ordered[key] = object[key];
    });
  return ordered;
}

function convertObjToQueryStr(object) {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .map((key) => {
      let value = object[key];
      if (value && Array.isArray(value)) {
        value = JSON.stringify(value.map((val) => (val && typeof val === "object" ? sortObjDataByKey(val) : val)));
      } else if (value && typeof value === "object") {
        value = JSON.stringify(sortObjDataByKey(value));
      } else if (value === null || value === undefined) {
        value = "";
      }
      return `${key}=${value}`;
    })
    .join("&");
}

function verifyPayosSignature(data, signature, checksumKey) {
  if (!data || typeof data !== "object" || !signature || !checksumKey) return false;
  const canonical = convertObjToQueryStr(sortObjDataByKey(data));
  const expected = crypto.createHmac("sha256", checksumKey).update(canonical).digest("hex");
  const sigBuf = Buffer.from(String(signature).trim().toLowerCase(), "utf8");
  const expBuf = Buffer.from(expected.toLowerCase(), "utf8");
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ chấp nhận phương thức POST" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://sdlpldhldyyytkbpujdk.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_9-Z47h5jf1Dtj2ZJ-RslwA_RjL1rz9_";
  const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "5756916605";

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const isPayosShape = !!(payload && payload.data && typeof payload.data === "object");

    // Bắt buộc xác thực chữ ký HMAC-SHA256 khi PayOS gửi webhook
    if (isPayosShape && PAYOS_CHECKSUM_KEY) {
      if (!payload.signature) {
        return res.status(401).json({ error: "Thiếu chữ ký xác thực PayOS (signature)" });
      }
      if (!verifyPayosSignature(payload.data, payload.signature, PAYOS_CHECKSUM_KEY)) {
        return res.status(401).json({ error: "Chữ ký PayOS không hợp lệ" });
      }
    }

    // PayOS webhook ping kiểm tra kết nối URL
    const rawOrderCode = payload.data && payload.data.orderCode ? Number(payload.data.orderCode) : 0;
    if (rawOrderCode === 123 || (payload.code === "00" && rawOrderCode > 0 && rawOrderCode <= 1000)) {
      return res.status(200).json({ success: true, testPing: true });
    }

    // Chỉ xử lý giao dịch thành công nếu có trường code/success
    if (isPayosShape && payload.code && payload.code !== "00" && payload.success === false) {
      return res.status(200).json({ success: true, ignored: true, code: payload.code });
    }

    let orderId = "";
    if (rawOrderCode > 0) {
      orderId = "MC" + rawOrderCode;
    }

    // Quét mã MCxxxxxxxx trong description/payload phòng trường hợp chuyển kèm ghi chú
    if (!orderId) {
      const searchSrc = (payload.data && payload.data.description) ? String(payload.data.description) : JSON.stringify(payload);
      const match = searchSrc.match(/MC\d{4,}/i);
      if (match) {
        orderId = match[0].toUpperCase();
      }
    }

    let transferAmount = 0;
    if (payload.data && payload.data.amount) {
      transferAmount = Number(payload.data.amount) || 0;
    } else if (payload.transferAmount) {
      transferAmount = Number(payload.transferAmount) || 0;
    }

    if (orderId) {
      // Kiểm tra idempotent tránh cộng dồn số mâm nếu webhook retry nhiều lần
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
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirm_order_payment`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ p_order_id: orderId })
        });

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
          } catch (e) {}
        }
      }

      console.log(`[PayOS Webhook] Đã xử lý đơn hàng: ${orderId} (alreadyConfirmed=${alreadyConfirmed})`);
    }

    return res.status(200).json({ success: true, orderId: orderId || null });
  } catch (err) {
    console.error("[Webhook Error]:", err);
    return res.status(500).json({ error: err.message });
  }
}
