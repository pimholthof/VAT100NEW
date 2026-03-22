import { getDashboardData } from "./features/dashboard/actions";

async function run() {
  const start = Date.now();
  console.log("Fetching dashboard data...");
  await getDashboardData();
  console.log("Time taken:", Date.now() - start, "ms");
}
run();
