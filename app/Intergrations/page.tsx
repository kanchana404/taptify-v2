"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";
import config from '@/lib/config';

export default function GoogleBusinessConnectPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Build OAuth URL dynamically using config
  const buildOAuthUrl = () => {
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.redirectUri,
      scope: 'https://www.googleapis.com/auth/business.manage',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });
    
    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
  };

  const oauthUrl = buildOAuthUrl();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      checkConnectionStatus();
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      console.log('Integrations: Checking connection status...');
      setIsLoading(true);
      const response = await fetch('/api/business?type=connection-status');
      console.log('Integrations: Connection status response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Integrations: Connection status data:', data);
        setIsConnected(data.connected || false);
      } else {
        console.error('Integrations: Connection status failed:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Integrations: Connection status error data:', errorData);
      }
    } catch (error) {
      console.error('Integrations: Error checking connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    if (typeof window !== 'undefined') {
      console.log('Integrations: Starting Google connection...');
      console.log('Integrations: OAuth URL:', oauthUrl);
      setIsConnecting(true);
      window.location.href = oauthUrl;
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const integrations = [
    {
      name: "Google Business",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
      status: isConnected ? "connected" : "available",
      action: isConnected ? handleDisconnect : handleConnect,
      loading: isLoading || isConnecting
    },
    {
      name: "Facebook",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path fill="#1877f2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      status: "soon"
    }
  ];

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
              <p className="text-sm text-muted-foreground">
                Connect your platforms and streamline your workflow
              </p>
            </div>

            {/* Integration Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {integrations.map((integration, index) => (
                <Card 
                  key={index} 
                  className={`group relative overflow-hidden border-0 bg-card/50 backdrop-blur-sm transition-all hover:bg-card/80 hover:shadow-sm ${
                    integration.status === 'mystery' ? 'opacity-40' : 
                    integration.status === 'soon' ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    {/* Status Indicator */}
                    {integration.status === 'connected' && (
                      <div className="absolute right-2 top-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
                      integration.status === 'mystery' 
                        ? 'border border-dashed border-muted-foreground/30' 
                        : 'bg-muted/50'
                    } transition-colors group-hover:bg-muted`}>
                      {integration.icon}
                    </div>

                    {/* Name */}
                    <h3 className="mb-3 text-sm font-medium leading-none">
                      {integration.name}
                    </h3>

                    {/* Status Badge */}
                    <div className="mb-3 flex items-center gap-1">
                      {integration.status === 'connected' && (
                        <div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-950 dark:text-green-400">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Connected
                        </div>
                      )}
                      {integration.status === 'available' && (
                        <div className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                          Available
                        </div>
                      )}
                      {(integration.status === 'soon' || integration.status === 'mystery') && (
                        <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          Soon
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {integration.status === 'available' && (
                      <Button
                        onClick={integration.action}
                        disabled={integration.loading}
                        size="sm"
                        className="h-7 w-full text-xs"
                      >
                        {integration.loading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    )}
                    
                    {integration.status === 'connected' && (
                      <Button
                        onClick={integration.action}
                        disabled={integration.loading}
                        variant="outline"
                        size="sm"
                        className="h-7 w-full text-xs"
                      >
                        {integration.loading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Disconnect'
                        )}
                      </Button>
                    )}

                    {(integration.status === 'soon' || integration.status === 'mystery') && (
                      <Button disabled size="sm" variant="ghost" className="h-7 w-full text-xs opacity-50">
                        Coming Soon
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}