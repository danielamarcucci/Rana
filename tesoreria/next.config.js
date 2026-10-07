/** @type {import('next').NextConfig} */
const seguridad = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["pg"],
  outputFileTracingIncludes: {
    "/api/informes/pdf": ["./src/lib/pdf/**/*"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: seguridad }];
  },
};

module.exports = nextConfig;
