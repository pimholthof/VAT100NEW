import { redirect } from "next/navigation";

// /dashboard/jaarrekening → redirect to current year
export default function JaarrekeningIndexPage() {
  const currentYear = new Date().getFullYear() - 1; // Default to last completed fiscal year
  redirect(`/dashboard/jaarrekening/${currentYear}`);
}
