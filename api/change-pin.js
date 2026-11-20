// Vercel Serverless Function: Backend PIN change for Mâm Cơm
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Phương thức không được hỗ trợ (chỉ nhận POST)' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { oldPin, newPin } = body;

    if (!oldPin || !newPin) {
      return res.status(400).json({ ok: false, error: 'Vui lòng điền đầy đủ mã PIN cũ và mã PIN mới' });
    }

    const cleanOld = String(oldPin).trim();
    const cleanNew = String(newPin).trim();

    if (cleanNew.length < 4) {
      return res.status(400).json({ ok: false, error: 'Mã PIN mới phải có ít nhất 4 ký tự' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || "https://sdlpldhldyyytkbpujdk.supabase.co";
    const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_9-Z47h5jf1Dtj2ZJ-RslwA_RjL1rz9_";

    // Gọi RPC admin_change_pin trong PostgreSQL
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_change_pin`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_old_pin: cleanOld, p_new_pin: cleanNew })
    });

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      let errMsg = "Lỗi đổi mã PIN từ hệ thống";
      try {
        const errObj = JSON.parse(errText);
        if (errObj && errObj.message) errMsg = errObj.message;
      } catch(e){}
      return res.status(400).json({ ok: false, error: errMsg });
    }

    return res.status(200).json({ ok: true, message: 'Đổi mã PIN quản trị thành công' });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Lỗi máy chủ: ' + ((err && err.message) || err)
    });
  }
}
