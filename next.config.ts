import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
};

export default withSentryConfig(
  withPWA(nextConfig),
  {
    org: "vat100",
    project: "vat100",
    silent: !process.env.CI,
    widenClientFileUpload: true,
    sourcemaps: {
      disable: true,
    },
    webpack: {
      reactComponentAnnotation: {
        enabled: true,
      },
      treeshake: {
        removeDebugLogging: true,
      },
      automaticVercelMonitors: true,
    },
  }
);
