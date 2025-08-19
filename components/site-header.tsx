"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PackagesDialog } from "@/components/packages-dialog";
import { RefreshCw } from "lucide-react";

interface Package {
  id: number;
  name: string;
  price: number;
  credits_enabled: boolean;
  qr_enabled: boolean;
  incoming_calls_enabled: boolean;
  reschedule_enabled: boolean;
  script_change_enabled: boolean;
  voice_selection_enabled: boolean;
  review_protection_enabled: boolean;
  remove_branding_enabled: boolean;
  custom_twilio_enabled: boolean;
  sms_count: number;
  credit_count: number;
}

export function SiteHeader() {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showPackages, setShowPackages] = useState(false);
  const [previousBalance, setPreviousBalance] = useState<number | null>(null);
  const [creditsUpdated, setCreditsUpdated] = useState(false);

  // Fetch user credit balance
  const fetchCreditBalance = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/credit-history?limit=1', {
        cache: 'no-store' // Ensure we don't get cached data
      });
      
      if (response.ok) {
        const data = await response.json();
        const newBalance = data.currentBalance || 0;
        
        // Check if credits have increased (likely from a purchase)
        if (previousBalance !== null && newBalance > previousBalance) {
          const increase = newBalance - previousBalance;
          // Show a simple notification
          console.log(`🎉 Credits updated! +${increase.toFixed(2)} credits added to your account.`);
          
          // Set visual indicator
          setCreditsUpdated(true);
          setTimeout(() => setCreditsUpdated(false), 3000); // Clear after 3 seconds
          
          // Show browser notification if permission is granted
          if (Notification.permission === 'granted') {
            new Notification('Credits Updated! 🎉', {
              body: `+${increase.toFixed(2)} credits have been added to your account.`,
              icon: '/logo.png',
              badge: '/logo.png'
            });
          }
        }
        
        setPreviousBalance(newBalance);
        setCurrentBalance(newBalance);
      }
    } catch (error) {
      console.error('Failed to fetch credit balance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [previousBalance]);

  useEffect(() => {
    fetchCreditBalance();
  }, [fetchCreditBalance]);

  // Add focus event listener to refresh credits when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      // Refresh credits when user returns to the page (e.g., after payment)
      fetchCreditBalance();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchCreditBalance]);

  // Add periodic refresh to keep credits up to date
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCreditBalance();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchCreditBalance]);

  // Request notification permission for credit updates
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch available packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch('/api/packages');
        if (response.ok) {
          const data = await response.json();
          setPackages(data.packages || []);
        }
      } catch (error) {
        console.error('Failed to fetch packages:', error);
      }
    };

    fetchPackages();
  }, []);

  // Parse credit value safely
  const parseCreditValue = (value: number | string | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    
    if (typeof value === 'string') {
      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) ? 0 : parsedValue;
    }
    
    return value;
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
        </div>
        
        {/* Clickable credits display with refresh button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPackages(true)}
            className={`text-sm font-medium hover:text-purple-500 transition-colors ${
              creditsUpdated ? 'animate-pulse text-green-600' : ''
            }`}
          >
            Credits: <span className={`font-bold ${creditsUpdated ? 'text-green-600' : 'text-purple-500'}`}>
              {loading ? "..." : parseCreditValue(currentBalance).toFixed(2)}
            </span>
          </button>
          <button
            onClick={fetchCreditBalance}
            disabled={refreshing}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh credits"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <PackagesDialog
        open={showPackages}
        onOpenChange={setShowPackages}
        packages={packages}
      />
    </header>
  );
}