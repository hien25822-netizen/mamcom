// Vercel Serverless Function: Sinh ảnh VietQR dạng PNG same-origin (không dính CORS, không qua SVG wrapper)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const q = req.query || {};
    const bin = String(q.bin || "970422").replace(/[^0-9]/g, "").slice(0, 8) || "970422";
    const account = String(q.account || "2258228668").replace(/[^A-Za-z0-9]/g, "").slice(0, 32) || "2258228668";
    const amount = Math.max(0, Math.round(Number(q.amount) || 0));
    const addInfo = String(q.addInfo || "").trim().slice(0, 60);
    const accountName = String(q.accountName || "NGUYEN QUANG HIEN").trim().slice(0, 80);

    const targetUrl =
      "https://img.vietqr.io/image/" +
      encodeURIComponent(bin) +
      "-" +
      encodeURIComponent(account) +
      "-qr_only.svg?amount=" +
      encodeURIComponent(String(amount)) +
      "&addInfo=" +
      encodeURIComponent(addInfo) +
      "&accountName=" +
      encodeURIComponent(accountName);

    const upstream = await fetch(targetUrl, { redirect: "follow" });
    if (!upstream.ok) {
      return res.status(502).json({ error: "VietQR upstream HTTP " + upstream.status });
    }

    const contentType = String(upstream.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("svg")) {
      const svgText = await upstream.text();
      const b64Match = svgText.match(/href=["']data:image\/png;base64,([A-Za-z0-9+/=]+)["']/i);
      if (b64Match && b64Match[1]) {
        const pngBuf = Buffer.from(b64Match[1], "base64");
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(pngBuf);
      }
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(svgText);
    }

    const arrBuf = await upstream.arrayBuffer();
    const rawBuf = Buffer.from(arrBuf);
    res.setHeader("Content-Type", contentType || "image/png");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(rawBuf);
  } catch (err) {
    console.error("[qr-image error]:", err);
    return res.status(500).json({ error: err.message || "QR image generation failed" });
  }
}
