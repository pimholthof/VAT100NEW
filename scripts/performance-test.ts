/**
 * VAT100 Performance Test Script
 * 
 * This script tests dashboard performance with large datasets.
 * Run with: npx tsx scripts/performance-test.ts
 * 
 * Tests:
 * - Dashboard RPC with 1000+ invoices
 * - Query execution times
 * - Concurrent user simulation
 */

import { createServiceClient } from "@/lib/supabase/service";

interface TestResult {
  test: string;
  duration: number;
  success: boolean;
  rows?: number;
  error?: string;
}

interface PerformanceMetrics {
  timestamp: string;
  results: TestResult[];
  totalDuration: number;
}

const TEST_USER_ID = process.env.TEST_USER_ID || "00000000-0000-0000-0000-000000000000";

/**
 * Generate test data (run once)
 */
async function generateTestData(supabase: ReturnType<typeof createServiceClient>): Promise<void> {
  console.log("📝 Generating test data...");
  
  // Create test client
  const { data: client } = await supabase
    .from("clients")
    .insert({
      user_id: TEST_USER_ID,
      name: "Performance Test Client",
      email: "test@vat100.nl",
    })
    .select()
    .single();
  
  if (!client) {
    console.log("⚠️  Could not create test client, skipping data generation");
    return;
  }
  
  // Generate 1000 invoices
  const batchSize = 100;
  const totalInvoices = 1000;
  
  for (let batch = 0; batch < totalInvoices / batchSize; batch++) {
    const invoices = [];
    for (let i = 0; i < batchSize; i++) {
      const num = batch * batchSize + i + 1;
      invoices.push({
        user_id: TEST_USER_ID,
        client_id: client.id,
        invoice_number: `TEST-${num.toString().padStart(4, "0")}`,
        status: ["draft", "sent", "paid", "overdue"][Math.floor(Math.random() * 4)],
        issue_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split("T")[0],
        subtotal_ex_vat: Math.floor(Math.random() * 10000) / 100,
        vat_amount: Math.floor(Math.random() * 2100) / 100,
        total_inc_vat: 0,
        vat_rate: 21,
      });
    }
    
    // Calculate total
    invoices.forEach(inv => {
      inv.total_inc_vat = inv.subtotal_ex_vat + inv.vat_amount;
    });
    
    const { error } = await supabase.from("invoices").insert(invoices);
    if (error) {
      console.log(`⚠️  Batch ${batch + 1} failed: ${error.message}`);
    } else {
      console.log(`✅ Batch ${batch + 1}/${totalInvoices / batchSize} inserted`);
    }
  }
  
  console.log("✅ Test data generated");
}

/**
 * Test 1: Dashboard RPC performance
 */
async function testDashboardRPC(supabase: ReturnType<typeof createServiceClient>): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const { data, error } = await supabase.rpc("get_dashboard_stats", {
      p_user_id: TEST_USER_ID,
    });
    
    const duration = Date.now() - start;
    
    if (error) {
      return {
        test: "Dashboard RPC",
        duration,
        success: false,
        error: error.message,
      };
    }
    
    // Count total data points
    const totalRows = 
      (data.recentInvoices?.length || 0) +
      (data.openInvoices?.length || 0) +
      (data.cashflowRevenue?.length || 0);
    
    return {
      test: "Dashboard RPC",
      duration,
      success: true,
      rows: totalRows,
    };
  } catch (e) {
    return {
      test: "Dashboard RPC",
      duration: Date.now() - start,
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Test 2: Invoice list query
 */
async function testInvoiceList(supabase: ReturnType<typeof createServiceClient>): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, client:clients(name)")
      .eq("user_id", TEST_USER_ID)
      .order("created_at", { ascending: false })
      .limit(100);
    
    const duration = Date.now() - start;
    
    return {
      test: "Invoice List Query",
      duration,
      success: !error,
      rows: data?.length || 0,
      error: error?.message,
    };
  } catch (e) {
    return {
      test: "Invoice List Query",
      duration: Date.now() - start,
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Test 3: Receipts with storage
 */
async function testReceipts(supabase: ReturnType<typeof createServiceClient>): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .order("created_at", { ascending: false })
      .limit(200);
    
    const duration = Date.now() - start;
    
    return {
      test: "Receipts Query",
      duration,
      success: !error,
      rows: data?.length || 0,
      error: error?.message,
    };
  } catch (e) {
    return {
      test: "Receipts Query",
      duration: Date.now() - start,
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Test 4: Concurrent queries simulation
 */
async function testConcurrentQueries(supabase: ReturnType<typeof createServiceClient>): Promise<TestResult> {
  const start = Date.now();
  const concurrentCount = 10;
  
  try {
    const promises = Array(concurrentCount).fill(null).map(() =>
      supabase.rpc("get_dashboard_stats", { p_user_id: TEST_USER_ID })
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    const allSuccess = results.every(r => !r.error);
    
    return {
      test: `Concurrent Queries (${concurrentCount}x)`,
      duration,
      success: allSuccess,
      error: allSuccess ? undefined : "Some queries failed",
    };
  } catch (e) {
    return {
      test: "Concurrent Queries",
      duration: Date.now() - start,
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Test 5: Complex aggregation
 */
async function testAggregation(supabase: ReturnType<typeof createServiceClient>): Promise<TestResult> {
  const start = Date.now();
  
  try {
    // Use RPC for aggregation queries
    const { data, error } = await supabase.rpc("get_dashboard_stats", {
      p_user_id: TEST_USER_ID,
    });
    
    const duration = Date.now() - start;
    
    return {
      test: "Aggregation Query",
      duration,
      success: !error,
      rows: data ? 1 : 0,
      error: error?.message,
    };
  } catch (e) {
    return {
      test: "Aggregation Query",
      duration: Date.now() - start,
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Test 6: Search performance
 */
async function testSearch(supabase: ReturnType<typeof createServiceClient>): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, client:clients(name)")
      .eq("user_id", TEST_USER_ID)
      .ilike("invoice_number", "%TEST%")
      .limit(50);
    
    const duration = Date.now() - start;
    
    return {
      test: "Search Query",
      duration,
      success: !error,
      rows: data?.length || 0,
      error: error?.message,
    };
  } catch (e) {
    return {
      test: "Search Query",
      duration: Date.now() - start,
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Run all tests
 */
async function runPerformanceTests(): Promise<PerformanceMetrics> {
  const startTime = Date.now();
  const supabase = createServiceClient();
  
  console.log("🚀 VAT100 Performance Test\n");
  console.log(`Test User ID: ${TEST_USER_ID}\n`);
  
  // Check if test data exists
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", TEST_USER_ID);
  
  console.log(`Found ${count || 0} test invoices\n`);
  
  if ((count || 0) < 100) {
    console.log("⚠️  Low test data. Consider running with more data.");
    console.log("Run with TEST_USER_ID=xxx to target specific user\n");
  }
  
  const results: TestResult[] = [];
  
  // Run tests
  console.log("Running tests...\n");
  
  results.push(await testDashboardRPC(supabase));
  results.push(await testInvoiceList(supabase));
  results.push(await testReceipts(supabase));
  results.push(await testConcurrentQueries(supabase));
  results.push(await testAggregation(supabase));
  results.push(await testSearch(supabase));
  
  const totalDuration = Date.now() - startTime;
  
  return {
    timestamp: new Date().toISOString(),
    results,
    totalDuration,
  };
}

/**
 * Print results
 */
function printResults(metrics: PerformanceMetrics): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 PERFORMANCE TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${metrics.timestamp}\n`);
  
  console.log("Test Results:");
  console.log("-".repeat(60));
  
  metrics.results.forEach(result => {
    const status = result.success ? "✅" : "❌";
    const color = result.success ? "" : ""; // Would use chalk in real terminal
    const rows = result.rows !== undefined ? ` (${result.rows} rows)` : "";
    const warning = result.duration > 1000 ? " ⚠️ SLOW" : "";
    
    console.log(
      `${status} ${result.test.padEnd(30)} ${result.duration.toString().padStart(5)}ms${rows}${warning}`
    );
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log("-".repeat(60));
  console.log(`Total Duration: ${metrics.totalDuration}ms`);
  
  // Summary
  const slowTests = metrics.results.filter(r => r.duration > 1000);
  const failedTests = metrics.results.filter(r => !r.success);
  
  console.log("\n📈 Summary:");
  console.log(`  Total Tests: ${metrics.results.length}`);
  console.log(`  Passed: ${metrics.results.length - failedTests.length}`);
  console.log(`  Failed: ${failedTests.length}`);
  console.log(`  Slow (>1000ms): ${slowTests.length}`);
  
  if (slowTests.length > 0) {
    console.log("\n⚠️  Slow Queries Detected:");
    slowTests.forEach(t => {
      console.log(`  - ${t.test}: ${t.duration}ms`);
    });
    console.log("\n💡 Consider:");
    console.log("  - Adding database indexes");
    console.log("  - Implementing query caching");
    console.log("  - Reducing result set size");
  }
  
  console.log("\n" + "=".repeat(60));
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(metrics: PerformanceMetrics): void {
  const recommendations: string[] = [];
  
  const dashboardResult = metrics.results.find(r => r.test === "Dashboard RPC");
  if (dashboardResult && dashboardResult.duration > 500) {
    recommendations.push("Dashboard RPC >500ms: Consider caching get_dashboard_stats results");
  }
  
  const concurrentResult = metrics.results.find(r => r.test.includes("Concurrent"));
  if (concurrentResult && concurrentResult.duration > 2000) {
    recommendations.push("Concurrent queries slow: Check connection pool size (max 60)");
  }
  
  const searchResult = metrics.results.find(r => r.test === "Search Query");
  if (searchResult && searchResult.duration > 300) {
    recommendations.push("Search query slow: Add GIN index on invoice_number");
  }
  
  if (recommendations.length > 0) {
    console.log("\n🔧 Optimization Recommendations:");
    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  } else {
    console.log("\n✨ No immediate optimizations needed!");
  }
}

// Main execution
if (require.main === module || import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceTests()
    .then(metrics => {
      printResults(metrics);
      generateRecommendations(metrics);
      
      // Exit with error code if any test failed
      const hasFailures = metrics.results.some(r => !r.success);
      process.exit(hasFailures ? 1 : 0);
    })
    .catch(err => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

export { runPerformanceTests, generateTestData };
