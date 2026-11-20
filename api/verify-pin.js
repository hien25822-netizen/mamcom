// Vercel Serverless Function: Backend PIN verification for Mâm Cơm
// Giấu toàn bộ mã PIN ở frontend và ủy quyền xác thực cho Backend / Supabase RPC
export default async function handler(req, res) {
  // Chỉ chấp nhận POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Phương thức không được hỗ trợ (chỉ nhận POST)' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const pin = body.pin;

    if (!pin || typeof pin !== 'string' || !pin.trim()) {
      return res.status(400).json({ ok: false, error: 'Vui lòng nhập mã PIN quản trị' });
    }

    const cleanPin = pin.trim();
    const SUPABASE_URL = process.env.SUPABASE_URL || "https://sdlpldhldyyytkbpujdk.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_9-Z47h5jf1Dtj2ZJ-RslwA_RjL1rz9_";

    // Gọi backend RPC admin_verify_pin trong PostgreSQL (Security Definer, bCrypt hash, rate limit)
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_verify_pin`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_pin: cleanPin })
    });

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      let errMsg = "Lỗi xác thực mã PIN từ hệ thống";
      try {
        const errObj = JSON.parse(errText);
        if (errObj && errObj.message) errMsg = errObj.message;
      } catch(e){}

      if (errMsg.includes('khóa') || errMsg.includes('lock') || errMsg.includes('10 phút') || errMsg.includes('sai nhiều lần')) {
        return res.status(429).json({
          ok: false,
          error: 'Tài khoản chủ tạm khóa 10 phút do nhập sai quá nhiều lần!'
        });
      }

      return res.status(401).json({ ok: false, error: errMsg });
    }

    const isOk = await rpcRes.json();
    if (isOk === true) {
      return res.status(200).json({
        ok: true,
        message: 'Xác thực mã PIN quản trị thành công'
      });
    } else {
      return res.status(401).json({
        ok: false,
        error: 'Mã PIN quản trị không chính xác'
      });
    }
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Lỗi máy chủ: ' + ((err && err.message) || err)
    });
  }
}
