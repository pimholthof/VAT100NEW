import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
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
