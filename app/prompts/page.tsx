"use client";

import React from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Import prompt management components
import PromptsTabsContainer from '@/components/PromptsTabsContainer';

export default function PromptsPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <SiteHeader />
            <div className="flex-1 overflow-auto">
              <div className="container mx-auto py-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold tracking-tight">Prompt Management</h1>
                  <p className="text-muted-foreground">
                    Customize your AI prompts for inbound and outbound communications
                  </p>
                </div>

                <div className="space-y-6">
                  <PromptsTabsContainer userId={user?.id} />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
} 