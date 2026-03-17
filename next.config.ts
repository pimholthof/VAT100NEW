import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(
  withPWA(nextConfig),
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
