import { getDashboardData } from "./lib/actions/dashboard";

async function run() {
  const start = Date.now();
  console.log("Fetching dashboard data...");
  const result = await getDashboardData();
  console.log("Time taken:", Date.now() - start, "ms");
}
run();
