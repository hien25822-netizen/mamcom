// Vercel Serverless Function: Proxy same-origin lấy đúng ảnh VietQR PRO compact2 chính thức từ img.vietqr.io (chống SSRF, 0 lỗi CORS)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const q = req.query || {};
    const safeAcc = String(q.acc || q.account || "2258228668")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 32) || "2258228668";
    const cleanAmount = Math.max(0, Math.round(Number(q.amount) || 0));
    const safeInfo = String(q.info || q.addInfo || "").trim().slice(0, 60);
    const safeName = String(q.name || q.accountName || "NGUYEN QUANG HIEN").trim().slice(0, 80);

    // Khóa cứng host đích img.vietqr.io + mã ngân hàng MB 970422 (chống SSRF tuyệt đối)
    const targetUrl =
      "https://img.vietqr.io/image/970422-" +
      encodeURIComponent(safeAcc) +
      "-compact2.jpg?amount=" +
      encodeURIComponent(String(cleanAmount)) +
      "&addInfo=" +
      encodeURIComponent(safeInfo) +
      "&accountName=" +
      encodeURIComponent(safeName);

    const upstream = await fetch(targetUrl, { redirect: "follow" });
    if (!upstream.ok) {
      return res.status(502).json({ error: "VietQR upstream HTTP " + upstream.status });
    }

    const contentType = String(upstream.headers.get("content-type") || "image/jpeg").toLowerCase();
    const arrBuf = await upstream.arrayBuffer();
    const rawBuf = Buffer.from(arrBuf);

    if (contentType.includes("svg")) {
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    } else if (contentType.includes("png")) {
      res.setHeader("Content-Type", "image/png");
    } else {
      res.setHeader("Content-Type", "image/jpeg");
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", `inline; filename="VietQR_MamCom_${safeInfo.replace(/[^A-Za-z0-9_-]/g, "") || "order"}.jpg"`);

    if (req.method === "HEAD") {
      return res.status(200).end();
    }
    return res.status(200).send(rawBuf);
  } catch (err) {
    console.error("[qr-download error]:", err);
    return res.status(500).json({ error: err.message || "QR download proxy failed" });
  }
}
