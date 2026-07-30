import type { NextConfig } from "next";

// The frontend's own page at /accounts (the Storage page) and the
// backend's API routes (also mounted at /accounts/*, /files/*, etc. with
// no prefix — see backend/app/main.py) would collide if both lived on the
// same domain with no distinguishing path. Routing every backend call
// through /api/* here — proxied to the backend's own separate Render
// service — avoids that collision without changing a single backend
// route, and means only this frontend needs a custom domain; the backend
// keeps using its default *.onrender.com URL.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
