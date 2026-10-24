import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://*.firebaseio.com https://*.googleapis.com https://*.firebaseapp.com https://*.paytm.in https://*.paytm.com wss://*.firebaseio.com",
      "frame-src 'self' https://securegw.paytm.in https://securegw-stage.paytm.in https://*.paytm.in https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://securegw.paytm.in https://securegw-stage.paytm.in https://*.paytm.in",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // D:\ also contains a pnpm-lock.yaml; without an explicit root Turbopack
  // walks up to the drive and watches far more than this project.
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Product imagery is hot-linked from arbitrary marketplace CDNs and is
    // rendered with plain <img> tags (see product-card.tsx), so there is no
    // reason to let the optimiser proxy arbitrary remote hosts.
    dangerouslyAllowSVG: false,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
