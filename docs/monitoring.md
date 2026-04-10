# VAT100 Monitoring & Alerting Setup

## Overview

Dit document beschrijft hoe je VAT100 monitort in productie en waarschuwingen configureert voor kritieke issues.

## Inhoudsopgave

- [Sentry Setup](#sentry-setup)
- [Supabase Monitoring](#supabase-monitoring)
- [Vercel Analytics](#vercel-analytics)
- [Cron Job Monitoring](#cron-job-monitoring)
- [Custom Alerts](#custom-alerts)
- [Health Checks](#health-checks)

---

## Sentry Setup

### 1. Environment Variables

```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 2. Error Tracking

Sentry is al geconfigureerd in:
- `sentry.client.config.ts` - Client-side errors
- `sentry.server.config.ts` - Server-side errors  
- `sentry.edge.config.ts` - Edge runtime errors

### 3. Belangrijke Metrics

| Metric | Alert Threshold | Actie |
|--------|----------------|-------|
| Error Rate | > 1% | Check logs |
| API Failures | > 5/min | Check Supabase |
| Webhook Errors | > 3/hour | Check Mollie config |

### 4. Slack Integratie (Optioneel)

1. Ga naar Sentry → Integrations
2. Voeg Slack toe
3. Configureer alerts voor:
   - `production` environment
   - Error level: `error`, `fatal`

---

## Supabase Monitoring

### 1. Database Dashboard

- URL: https://app.supabase.com/project/_/database
- Monitor:
  - Connection pool (max 60)
  - Query performance (> 100ms is langzaam)
  - Storage usage

### 2. Query Performance

Langzame queries detecteren:

```sql
-- Top 10 langzaamste queries (laatste 24u)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 3. Belangrijke Checks

| Check | Frequentie | Alert Indien |
|-------|-----------|--------------|
| Deadlocks | Dagelijks | > 0 |
| Failed Auth | Real-time | > 10/min |
| Storage | Dagelijks | > 80% |

---

## Vercel Analytics

### 1. Web Vitals

Monitor in Vercel Dashboard:
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

### 2. API Routes Performance

Check in Vercel Logs:
- API routes > 5s response time
- Error rate > 1%

---

## Cron Job Monitoring

### 1. System Events Tabel

Alle cron jobs loggen naar `system_events`:

```sql
-- Check recent cron runs
SELECT 
  event_type,
  payload,
  processed_at,
  created_at
FROM system_events
WHERE event_type LIKE 'cron.%'
ORDER BY created_at DESC
LIMIT 20;
```

### 2. Belangrijke Cron Jobs

| Job | Schedule | Check |
|-----|----------|-------|
| `cron.recurring` | 02:00 dagelijks | Facturen gegenereerd |
| `cron.agents` | 03:00 dagelijks | Agents uitgevoerd |
| `cron.overdue` | 06:00 dagelijks | Overdue facturen gemarkeerd |
| `cron.sync-bank` | 07:00 dagelijks | Bank sync succes |
| `cron.events` | Elke 15 min | Events verwerkt |

### 3. Failed Cron Alert

```sql
-- Check voor failed crons (laatste 24u)
SELECT 
  event_type,
  payload->>'errors' as errors,
  created_at
FROM system_events
WHERE 
  event_type LIKE 'cron.%'
  AND (
    payload->>'errors' IS NOT NULL 
    OR payload->>'failures' > '0'
  )
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## Custom Alerts

### 1. Admin Dashboard Alerting

Voeg toe aan `/admin/systeem` pagina:

```typescript
// Check voor issues
const healthChecks = {
  failedCrons: await checkFailedCrons(),
  highErrorRate: await checkErrorRate(),
  pendingUsers: await checkPendingUsers(),
  overdueInvoices: await checkOverdueInvoices(),
};
```

### 2. Email Alerts (Resend)

Configureer in `lib/email/send-admin.ts`:

```typescript
export async function sendAdminAlert({
  type: 'system_error' | 'high_churn' | 'payment_failure',
  severity: 'warning' | 'critical',
  message: string,
  data?: Record<string, unknown>,
}) {
  // Implementation in send-admin.ts
}
```

### 3. Alert Triggers

| Trigger | Severity | Actie |
|---------|----------|-------|
| Payment failures > 10/hour | Critical | Check Mollie |
| New signups = 0 (24u) | Warning | Check marketing |
| Churn rate > 10% | Warning | Retention agent |
| Failed webhooks > 5/hour | Critical | Check endpoint |

---

## Health Checks

### 1. API Health Endpoint

Bestaand: `/api/health`

Test:
```bash
curl https://app.vat100.nl/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-10T15:30:00Z",
  "version": "0.1.0"
}
```

### 2. Database Health

```sql
-- Health check query (lichtgewicht)
SELECT 1 as healthy;
```

### 3. External Services

| Service | Check | Interval |
|---------|-------|----------|
| Supabase | SELECT 1 | 1 min |
| Mollie | GET /v2/methods | 5 min |
| Resend | GET /v1/domains | 5 min |

---

## Dashboards

### 1. Admin Systeem Status

Beschikbaar op: `/admin/systeem`

Toont:
- Cron job status (laatste runs)
- Database connectiviteit
- Recent errors
- Systeem events backlog

### 2. Custom SQL Queries

```sql
-- Daily Active Users (DAU)
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM invoices
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;

-- Monthly Recurring Revenue (MRR)
SELECT 
  SUM(p.price_cents) / 100.0 as mrr
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active';

-- Churn Rate (laatste 30 dagen)
WITH cancelled AS (
  SELECT COUNT(*) as count
  FROM subscriptions
  WHERE status = 'cancelled'
    AND cancelled_at > NOW() - INTERVAL '30 days'
),
total AS (
  SELECT COUNT(*) as count
  FROM subscriptions
  WHERE created_at < NOW() - INTERVAL '30 days'
)
SELECT 
  (c.count::float / NULLIF(t.count, 0)) * 100 as churn_rate
FROM cancelled c, total t;
```

---

## Runbook: Common Issues

### Issue: Cron jobs falen

**Symptoom:** Geen nieuwe events in `system_events`

**Oplossing:**
1. Check Vercel Cron Logs
2. Verifieer `CRON_SECRET` is correct
3. Check `system_events` tabel bestaat:
   ```sql
   SELECT * FROM system_events LIMIT 1;
   ```

### Issue: High Error Rate

**Symptoom:** Sentry toont > 50 errors/uur

**Oplossing:**
1. Filter op `environment:production`
2. Check meest voorkomende error
3. Check Supabase connection pool
4. Restart Vercel deployment indien nodig

### Issue: Webhook failures

**Symptoom:** Mollie webhooks falen

**Oplossing:**
1. Check webhook endpoint accessible: `curl /api/webhooks/mollie`
2. Check rate limiting niet te streng
3. Verifieer Mollie API key nog geldig

---

## Contact & Escalatie

| Issue | Eerste Contact | Escalatie |
|-------|---------------|-----------|
| Supabase outage | Supabase Status | Supabase Support |
| Vercel issues | Vercel Status | Vercel Support |
| Payment failures | Mollie Status | Mollie Support |
| Application bug | Sentry logs | Developer |

---

## Quick Commands

```bash
# Check environment
npm run check-env

# Check types
npm run typecheck

# Local build test
npm run build

# Security audit
npm run security:audit

# Run tests
npm run test
```

---

*Laatst bijgewerkt: April 2026*
