"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { DebugCredits } from "@/components/debug-credits";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);
  
  const sessionId = searchParams.get('session_id');
  const packageId = searchParams.get('package_id');
  const credits = searchParams.get('credits');

  useEffect(() => {
    // If we have credits info, set it immediately
    if (credits) {
      setCreditsAdded(parseInt(credits));
    }

    // Redirect to dashboard after countdown
    const redirectTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Use router.push for better navigation
          router.push("/bussiness-data");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(redirectTimer);
    };
  }, [credits, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Thank you for your purchase! Your credits have been added to your account.
            </p>
            {creditsAdded && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>+{creditsAdded} credits</strong> have been added to your balance
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Redirecting to dashboard in {countdown} seconds...
            </p>
            <div className="pt-4">
              <button
                onClick={() => router.push("/bussiness-data")}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard Now
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Debug component for testing credits */}
        <div className="mx-auto">
          <DebugCredits />
        </div>
      </div>
    </div>
  );
} 