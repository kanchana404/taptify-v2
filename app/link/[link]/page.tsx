// app/link/[link]/page.tsx
import { redirect } from "next/navigation";
import db from "@/db/drizzle";
import { link, companyData } from "@/db/schema";
import { eq } from "drizzle-orm";

interface PageProps {
  params: {
    link: string;
  };
}

export default async function LinkPage({ params }: PageProps) {
  const linkId = params.link;

  // Find the link record with the provided link_id from the 'link' table
  const [linkRecord] = await db
    .select()
    .from(link)
    .where(eq(link.link_id, linkId));

  if (!linkRecord) {
    return <div>Invalid link</div>;
  }

  // Update the link record to mark it as visited and update the clicked_time
  await db
    .update(link)
    .set({
      link_status: "visit",
      clicked_time: new Date(), // Sets the current timestamp
    })
    .where(eq(link.link_id, linkId));

  // Retrieve the company details based on the user_id from the link record
  const [company] = await db
    .select()
    .from(companyData)
    .where(eq(companyData.user_id, linkRecord.user_id));

  if (!company || !company.link) {
    return <div>Company details not found</div>;
  }

  // Redirect to the company link
  redirect(company.link);
}
