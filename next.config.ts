import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {};

/**
 * Sentry's build step (Step 59, docs/ERROR-TRACKING.md), only to leave out
 * the parts of its browser code this app never uses: performance tracing,
 * screen recording, debug messages. That's 45 KB (compressed) less on every
 * page. No source maps are made or uploaded, so the build needs no token and
 * no network; it tags reports with the deploy's commit by itself.
 */
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
  bundleSizeOptimizations: {
    excludeTracing: true,
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
});
