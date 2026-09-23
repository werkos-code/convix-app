import { redirect } from "next/navigation";

export default async function DebtsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nieuw = Array.isArray(params.nieuw) ? params.nieuw[0] : params.nieuw;
  if (nieuw === "1") {
    redirect("/app/uitgaand?tab=schulden&nieuw=1");
  }
  redirect("/app/uitgaand?tab=schulden");
}
