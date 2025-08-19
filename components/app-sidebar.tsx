// components/AppSidebar.tsx
"use client";

import * as React from "react";
import {
  IconDashboard,
  IconClipboardCheck,
  IconUserCircle,
  IconMessageChatbot,
  IconCalendarTime,
  IconCreditCard,
  IconFileAnalytics,
  IconShield,
  IconMicrophone,
} from "@tabler/icons-react";
import { useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import { Blocks, Building2 } from "lucide-react";

/* ────────────────────────────────────────────────────────────────
 *  NAV DATA  – "Request Review" now deep‑links directly to that tab
 * ────────────────────────────────────────────────────────────── */
const data = {
  navMain: [
    { title: "Dashboard", url: "/", icon: IconDashboard },

    /* open outer tab "Request Review" immediately */
    {
      title: "Request Review",
      url: "/review?tab=Request%20Review",
      icon: IconClipboardCheck,
    },

    /* Added Review Management route */
    {
      title: "Review Management",
      url: "/review-management",
      icon: IconFileAnalytics,
    },

    /* Added Review Protection route */
    {
      title: "Review Protection",
      url: "/protect-review",
      icon: IconShield,
    },
  ],

  navSecondary: [
    {
      /* → Company/Profile Details */
      title: "Profile Info",
      url: "/review/profile",
      icon: IconUserCircle,
    },
    {
      title: "Prompt Management",
      icon: IconMessageChatbot,
      isDropdown: true,
      items: [
        {
          /* Inbound Calls Page */
          title: "Inbound Calls",
          url: "/review/inbound",
        },
        {
          /* Outbound Calls Page */
          title: "Outbound Calls",
          url: "/review/outbound",
        },
        {
          /* Voice Library Page */
          title: "Voice Library",
          url: "/voices",
        },
      ],
    },
    { title: "Re‑scheduled Calls", url: "/rescheduled", icon: IconCalendarTime },
    { title: "Credit History", url: "/history", icon: IconCreditCard },
    { title: "Intergrations", url: "/Intergrations", icon: Blocks },
    { title: "Bussiness Infomations", url: "/bussiness-data", icon: Building2  },
  ],
};

/* ---------- helper components ---------- */
const NavMain = ({ items }: { items: typeof data.navMain }) => (
  <div className="px-2 py-2">
    <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground">
      NAVIGATION
    </p>
    <SidebarMenu>
      {items.map(({ title, url, icon: Icon }, i) => (
        <SidebarMenuItem key={i}>
          <SidebarMenuButton asChild className="sidebar-nav-item hover:bg-accent hover:text-accent-foreground transition-all duration-200">
            <Link href={url} className="flex items-center gap-2">
              {Icon && <Icon className="size-4 purple-accent-text" />}
              <span className="text-foreground">{title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  </div>
);

const NavSecondary = ({
  items,
  className,
}: {
  items: typeof data.navSecondary;
  className?: string;
}) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (t: string) => setOpen((p) => ({ ...p, [t]: !p[t] }));

  const render = (arr: any[], depth = 0) =>
    arr.map((item, idx) => (
      <React.Fragment key={`${depth}-${idx}`}>
        <SidebarMenuItem>
          {item.isDropdown ? (
            <SidebarMenuButton
              onClick={() => toggle(item.title)}
              className="justify-between sidebar-nav-item hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            >
              <span className="flex items-center">
                {item.icon && (
                  <item.icon className="mr-2 size-4 purple-accent-text" />
                )}
                <span className="text-foreground">{item.title}</span>
              </span>
              <svg
                className={`size-4 transition-transform purple-accent-text ${open[item.title] ? "rotate-180" : ""
                  }`}
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                fill="none"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton asChild>
              <Link href={item.url}>
                {item.icon && (
                  <item.icon className="mr-2 size-4 text-purple-500" />
                )}
                {item.title}
              </Link>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>

        {item.isDropdown && open[item.title] && item.items && (
          <div className="ml-6 mt-1 mb-1 border-l-2 border-purple-200 pl-2 dark:border-purple-800">
            {render(item.items, depth + 1)}
          </div>
        )}
      </React.Fragment>
    ));

  return (
    <div className={`px-2 py-2 ${className ?? ""}`}>
      <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground">
        SETTINGS
      </p>
      <SidebarMenu>{render(items)}</SidebarMenu>
    </div>
  );
};

const UserProfile = () => {
  const { user } = useUser();
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm">
      <UserButton afterSignOutUrl="/" />
      {user && (
        <div className="flex flex-col">
          <span className="font-medium">{user.fullName ?? user.username}</span>
          <span className="text-xs text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </span>
        </div>
      )}
    </div>
  );
};

/* ---------------- main sidebar component ---------------- */
export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Image
                  src="/logo.png"
                  alt="Acme Inc. Logo"
                  width={80}
                  height={80}
                  className="h-auto w-auto"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-4" />
      </SidebarContent>

      <SidebarFooter>
        <UserProfile />
      </SidebarFooter>
    </Sidebar>
  );
}