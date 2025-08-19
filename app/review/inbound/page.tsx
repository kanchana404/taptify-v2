"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import CustomizePromptsTab, { InstructionsData } from "@/components/CustomizePromptsTab";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/* -------------------------------------------------------------------------- */
/*  PAGE WRAPPER                                                              */
/* -------------------------------------------------------------------------- */
export default function InboundReviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InboundReviewPageContent />
      <Toaster />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/*  MAIN COMPONENT                                                            */
/* -------------------------------------------------------------------------- */
function InboundReviewPageContent() {
  const { isLoaded, userId, isSignedIn } = useAuth();

  /* ---------------------- data state ---------------------- */
  const [instructions, setInstructions] = useState<InstructionsData>({
    company_name: "",
    agent_name: "",
    role: "",
    company_contact_number: "",
    company_contact_email: "",
    company_contact_address: "",
    experience_last_visit: "",
    product_or_service: "",
    link: "",
    first_message_prompt: "",
    reschedule_first_message_prompt: "",
    role_prompt: "",
    context_prompt: "",
    task_prompt: "",
    specifics_prompt: "",
    conversation_flow_prompt: "",
    sample_dialogue_prompt: "",
    key_points_prompt: "",
    link_prompt: "",
    after_call_prompt: "",
    knowledge_base: "",
    any_additional_requests: "",
    user_timezone: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      const fetchInstructions = async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/instructions?type=inbound");
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          setInstructions(await res.json());
        } catch (err) {
          console.error("Error fetching instructions:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInstructions();
    }
  }, [isLoaded, isSignedIn, userId]);



  /* ------------------ theme overrides ------------------ */
  const customStyles = {
    "--primary": "270 70% 50%",
    "--ring": "270 70% 50%",
  } as any;

  /* ---------------- auth loading / redirect ---------------- */
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="h-10 w-10 animate-spin border-4 border-purple-600 rounded-full border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h1 className="text-2xl font-bold text-purple-800 mb-4">
          Authentication Required
        </h1>
        <p className="text-gray-600 mb-6">
          You need to be signed in to access this page.
        </p>
      </div>
    );
  }

  /* ----------------------------------- RENDER ----------------------------------- */
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
        ...customStyles,
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col purple-fade-in">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Card className="mx-auto max-w-4xl purple-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">Inbound Call Prompts</CardTitle>
                    <CardDescription>
                      Customize what your customers hear when they call—make it personal and on-brand
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                                         <CustomizePromptsTab
                       instructions={instructions}
                       setInstructions={setInstructions}
                       isLoading={isLoading}
                       clientName="John Doe"
                       visitDate="Last week"
                       inboundTitle="Inbound Call Prompts"
                       inboundDescription="Customize what your customers hear when they call—make it personal and on-brand"
                       outboundTitle="Outbound Call Prompts"
                       outboundDescription="Customize what your customers hear when they receive a call—make it clear, personal, and professional"
                       forceType="inbound"
                     />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
