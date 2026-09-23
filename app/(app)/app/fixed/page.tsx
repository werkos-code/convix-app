import { redirect } from "next/navigation";

export default function FixedRedirectPage() {
  redirect("/app/uitgaand?tab=vaste-lasten");
}
