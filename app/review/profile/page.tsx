"use client";

import React, { Suspense } from "react";
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

import ProfileInfoPage from "@/components/ProfileInfoPage";
import { Toaster } from "@/components/ui/sonner";

/* -------------------------------------------------------------------------- */
/*  PAGE WRAPPER                                                              */
/* -------------------------------------------------------------------------- */
export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfilePageContent />
      <Toaster />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/*  MAIN COMPONENT                                                            */
/* -------------------------------------------------------------------------- */
function ProfilePageContent() {
  const { isLoaded, userId, isSignedIn } = useAuth();

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
                    <CardTitle className="text-foreground">Profile Information</CardTitle>
                    <CardDescription>
                      Manage your company profile and contact information
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-6">
                    <ProfileInfoPage />
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
