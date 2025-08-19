import { NextResponse, NextRequest } from "next/server";
import db from "@/db/drizzle";
import { userbase, callHistory, companyData } from "@/db/schema";
import { InferInsertModel } from "drizzle-orm";
import { getAuth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

interface AddToDbRequest {
  records: {
    Name: string;
    "Phone Number": string;
    "last visit date": string; // date as string
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { records } = (await request.json()) as AddToDbRequest;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid records data" },
        { status: 400 }
      );
    }

    // ✅ CREDIT CHECK ONLY
    const company = await db
      .select({
        id: companyData.id,
        user_id: companyData.user_id,
        company_name: companyData.company_name,
        agent_name: companyData.agent_name,
        contact_number: companyData.contact_number,
        contact_email: companyData.contact_email,
        company_address: companyData.company_address,
        product_or_service: companyData.product_or_service,
        link: companyData.link,
        credits: companyData.credits,
        created_at: companyData.created_at,
        updated_at: companyData.updated_at,
      })
      .from(companyData)
      .where(eq(companyData.user_id, userId))
      .limit(1);

    if (!company || company.length === 0) {
      return NextResponse.json(
        { error: "Company data not found" },
        { status: 404 }
      );
    }

    const userCompany = company[0];
    const totalCalls = records.length;
    const requiredCredits = totalCalls * 2;

    if ((userCompany.credits || 0) < requiredCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits,
          availableCredits: userCompany.credits,
        },
        { status: 403 }
      );
    }

    const results = [];
    for (const record of records) {
      const phone = record["Phone Number"];
      const name = record.Name;

      const existingUser = await db
        .select()
        .from(userbase)
        .where(and(eq(userbase.user_id, userId), eq(userbase.phone, phone)))
        .limit(1);

      let recordId: number | null = null;

      if (existingUser.length === 0) {
        const userToInsert: InferInsertModel<typeof userbase> = {
          user_id: userId,
          aaname: name,
          phone: phone,
          lastvisitdate: record["last visit date"]
            ? new Date(record["last visit date"])
            : null,
          callstatus: null,
          callattempts: null,
          recalldate: null,
        };

        const insertResult = await db
          .insert(userbase)
          .values(userToInsert)
          .returning({ id: userbase.id });

        if (insertResult && insertResult.length > 0) {
          recordId = insertResult[0].id;
        }

        results.push({ id: recordId, name, phone, status: "added" });
      } else {
        // For existing users, update the last visit date only if a new date is provided.
        recordId = existingUser[0].id;
        const newLastVisitDateStr = record["last visit date"];
        if (newLastVisitDateStr) {
          const newLastVisitDate = new Date(newLastVisitDateStr);
          // Optionally, check if the date is different than the existing one before updating.
          // Here we update unconditionally if a new date is provided.
          await db
            .update(userbase)
            .set({ lastvisitdate: newLastVisitDate })
            .where(eq(userbase.id, existingUser[0].id));
        }
        results.push({ id: recordId, name, phone, status: "already exists" });

        // Webhook for existing users
        try {
          const existingUserWebhookUrl =
            "https://n8n.srv745961.hstgr.cloud/webhook/8fbce3fb-b830-4500-81d3-7623ffa68e42";
          const webhookPayload = [
            {
              name: name,
              phone: phone,
              lastVisitDate: record["last visit date"] || null,
            },
          ];

          const webhookResponse = await fetch(existingUserWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookPayload),
          });

          if (!webhookResponse.ok) {
            console.error(
              `Failed to send existing user data to webhook:`,
              webhookResponse.statusText
            );
          }
        } catch (webhookError) {
          console.error(
            `Error sending existing user data to webhook:`,
            webhookError
          );
        }
      }

      // Create call history record
      const callHistoryInsert: InferInsertModel<typeof callHistory> = {
        user_id: userId,
        aaname: name,
        phone: phone,
        calltype: "outboundcall",
        callstatus: "pending",
        score: null,
        sms: "no",
        createdtime: new Date(),
      };

      const callHistoryResult = await db
        .insert(callHistory)
        .values(callHistoryInsert)
        .returning({ id: callHistory.id });

      const callHistoryId = callHistoryResult[0]?.id || null;

      const resultIndex = results.findIndex((r) => r.id === recordId);
      if (resultIndex !== -1) {
        results[resultIndex].callHistoryId = callHistoryId;
      }
    }

    // Optional webhook after processing all records
    let webhookStatus = "success";
    try {
      const webhookUrl =
        "https://n8n.srv745961.hstgr.cloud/webhook/e5dbde62-2b8e-470b-b19c-eb88ecf5eab2";
      const webhookPayload = {
        userId,
        records: results,
      };

      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        console.error(
          `Failed to send data to webhook:`,
          webhookResponse.statusText
        );
        webhookStatus = "failed";
      }
    } catch (webhookError) {
      console.error(`Error sending data to webhook:`, webhookError);
      webhookStatus = "failed";
    }

    return NextResponse.json({
      message: "Process completed successfully",
      results,
      creditsChecked: userCompany.credits,
      webhookStatus,
    });
  } catch (error) {
    console.error("Error processing users:", error);
    return NextResponse.json(
      {
        error: "Failed to process users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
