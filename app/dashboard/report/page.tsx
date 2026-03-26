import { redirect } from "next/navigation";
import { getJaarrekeningData } from "@/features/tax/jaarrekening";
import ReportClient from "./ReportClient";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ jaar?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const parsedYear = params.jaar ? parseInt(params.jaar, 10) : currentYear;
  const year =
    parsedYear >= 2020 && parsedYear <= currentYear ? parsedYear : currentYear;

  const result = await getJaarrekeningData(year);

  if (result.error === "Niet ingelogd.") redirect("/login");

  return (
    <ReportClient
      data={result.data ?? null}
      error={result.error}
      year={year}
    />
  );
}
