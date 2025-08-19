"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

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

interface PackagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: Package[];
}

export function PackagesDialog({ open, onOpenChange, packages }: PackagesDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePackageSelect = async (pkg: Package) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/packages/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      
      // Open the checkout URL in the same window
      window.location.href = data.checkoutUrl;
      
      // Close the dialog
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Available Packages</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col space-y-2 rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{pkg.name}</h3>
                <span className="text-lg font-bold">${pkg.price}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {pkg.credits_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>Credits</span>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.qr_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>QR Code</span>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.incoming_calls_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>Incoming Calls</span>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.reschedule_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>Reschedule</span>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.script_change_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>Script Change</span>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.voice_selection_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>Voice Selection</span>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.review_protection_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>Review Protection</span>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.remove_branding_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>Remove Branding</span>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.custom_twilio_enabled ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                  <span>Custom Twilio</span>
                </div>
              </div>
              
              {/* SMS and Credit Counts */}
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">SMS Count:</span>
                  <span className="text-sm font-semibold">{pkg.sms_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Credit Count:</span>
                  <span className="text-sm font-semibold">{pkg.credit_count.toLocaleString()}</span>
                </div>
              </div>
              
              <Button
                onClick={() => handlePackageSelect(pkg)}
                disabled={loading}
                className="mt-4"
              >
                {loading ? 'Processing...' : 'Select Package'}
              </Button>
            </div>
          ))}
          {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 