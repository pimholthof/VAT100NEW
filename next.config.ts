import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(
  nextConfig,
  {
    org: "vat100",
    project: "vat100",
    silent: !process.env.CI,
    widenClientFileUpload: true,
    reactComponentAnnotation: {
      enabled: true,
    },
    sourcemaps: {
      disable: true,
    },
    disableLogger: true,
    automaticVercelMonitors: true,
  }
);
