/**
 * Environment variable validation for VAT100
 * Run this script before build/deployment to verify all required env vars are set
 * 
 * Usage:
 *   npm run check-env    (add to package.json scripts)
 *   npx tsx lib/env.ts
 */

const requiredEnvVars = {
  // Supabase (Public - safe for client)
  NEXT_PUBLIC_SUPABASE_URL: { required: true, public: true },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: { required: true, public: true },
  
  // Supabase (Private - server only)
  SUPABASE_SERVICE_ROLE_KEY: { required: true, public: false },
  
  // Mollie Payments
  MOLLIE_API_KEY: { required: true, public: false },
  
  // Email (Resend)
  RESEND_API_KEY: { required: true, public: false },
  EMAIL_FROM: { required: true, public: false },
  
  // AI (Anthropic)
  ANTHROPIC_API_KEY: { required: true, public: false },
  
  // Security
  CRON_SECRET: { required: true, public: false },
  
  // Monitoring (Optional)
  NEXT_PUBLIC_SENTRY_DSN: { required: false, public: true },
  
  // App Config (Optional, has defaults)
  NEXT_PUBLIC_APP_URL: { required: false, public: true, default: "https://vat100.nl" },
} as const;

type EnvVar = keyof typeof requiredEnvVars;

interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  serverOnly: string[];
}

export function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const serverOnly: string[] = [];
  
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    
    if (config.required && !value) {
      missing.push(key);
    }
    
    if (!config.public && value) {
      serverOnly.push(key);
    }
    
    // Security checks for secrets
    if (value && config.required && value.length < 10) {
      warnings.push(`${key} seems too short, verify it's a valid secret`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
    serverOnly,
  };
}

export function checkServiceKeyExposure(): string[] {
  const issues: string[] = [];
  
  // Check if service role key is exposed anywhere
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    // Check common mistake: using service key as anon key
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === serviceKey) {
      issues.push("CRITICAL: SUPABASE_SERVICE_ROLE_KEY equals NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    
    // Check if service key starts with expected prefix
    if (!serviceKey.startsWith("eyJ")) {
      issues.push("WARNING: SUPABASE_SERVICE_ROLE_KEY doesn't look like a valid JWT");
    }
  }
  
  return issues;
}

// CLI execution
if (require.main === module || import.meta.url === `file://${process.argv[1]}`) {
  const isCI = !!(process.env.VERCEL || process.env.CI);
  const result = validateEnv();
  const exposureIssues = checkServiceKeyExposure();

  console.log("🔍 VAT100 Environment Validation\n");

  if (result.valid && result.warnings.length === 0 && exposureIssues.length === 0) {
    console.log("✅ All required environment variables are set");
    console.log(`🔒 ${result.serverOnly.length} server-only secrets configured`);
    process.exit(0);
  }

  if (!result.valid) {
    const prefix = isCI ? "⚠️  (CI)" : "❌";
    console.error(`${prefix} Missing required environment variables:`);
    result.missing.forEach(v => console.error(`   - ${v}`));
    console.error("");
  }

  if (exposureIssues.length > 0) {
    console.error("🚨 Security Issues:");
    exposureIssues.forEach(i => console.error(`   ${i}`));
    console.error("");
  }

  if (result.warnings.length > 0) {
    console.warn("⚠️  Warnings:");
    result.warnings.forEach(w => console.warn(`   ${w}`));
    console.warn("");
  }

  console.log("\nRequired environment variables:");
  Object.entries(requiredEnvVars)
    .filter(([_, c]) => c.required)
    .forEach(([key, _]) => {
      const status = process.env[key] ? "✅" : "❌";
      console.log(`  ${status} ${key}`);
    });

  if (isCI && !result.valid) {
    console.warn("\n⚠️  CI/Vercel build: env check skipped (env vars set at runtime)");
    process.exit(0);
  }

  process.exit(result.valid ? 0 : 1);
}
