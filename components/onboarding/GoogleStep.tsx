"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Shield, 
  Star,
  MessageSquare,
  Calendar,
  BarChart3,
  Loader2,
  Link,
  Sparkles
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GoogleStepProps {
  onComplete: (data: { connected: boolean }) => void;
  isConnected?: boolean;
}

const benefits = [
  {
    icon: Star,
    title: "Google Business Profile",
    description: "Manage your business listings and customer reviews",
    color: "bg-primary"
  },
  {
    icon: Calendar,
    title: "Automated Scheduling",
    description: "Schedule and publish content automatically",
    color: "bg-secondary"
  },
  {
    icon: MessageSquare,
    title: "Review Management",
    description: "Respond to Google reviews with AI assistance",
    color: "bg-accent"
  },
  {
    icon: BarChart3,
    title: "Analytics Integration",
    description: "Track performance and customer insights",
    color: "bg-primary"
  }
];

export default function GoogleStep({ onComplete, isConnected = false }: GoogleStepProps) {
  const searchParams = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "error">(
    isConnected ? "connected" : "idle"
  );
  const [googleAccount, setGoogleAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check connection status when component mounts
    checkGoogleConnection();
    
    // Set up periodic checking for when user returns from OAuth
    const interval = setInterval(checkGoogleConnection, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // If user is already connected, update the connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus("connected");
      // Try to get the account info
      checkGoogleConnection();
    }
  }, [isConnected]);



  // Check if user just returned from OAuth
  useEffect(() => {
    const authSuccess = searchParams.get('auth');
    if (authSuccess === 'success') {
      console.log('GoogleStep: Auth success detected, checking connection status...');
      // Small delay to ensure OAuth tokens are stored
      setTimeout(() => {
        checkGoogleConnection();
      }, 1000);
    }
  }, [searchParams]);

  const checkGoogleConnection = async () => {
    try {
      console.log("GoogleStep: Checking Google connection status...");
      const response = await fetch("/api/auth/status");
      if (response.ok) {
        const data = await response.json();
        console.log("GoogleStep: Auth status response:", data);
        if (data.isAuthenticated) {
          console.log("GoogleStep: Google is authenticated");
          setConnectionStatus("connected");
          setGoogleAccount(data.googleAccount || data.tokenInfo?.email || data.tokenInfo?.audience || "Google Account");
          
          // If we just detected a connection, automatically complete this step
          if (!isConnected) {
            console.log("GoogleStep: Google connection detected, auto-completing step");
            setTimeout(() => {
              onComplete({ connected: true });
            }, 1000); // Small delay to show the success state
          }
        } else {
          console.log("GoogleStep: Google is not authenticated");
        }
      }
    } catch (error) {
      console.error("Error checking Google connection:", error);
    }
  };

  const connectGoogle = async () => {
    setConnectionStatus("connecting");
    setIsLoading(true);
    
    try {
      console.log("GoogleStep: Starting Google connection process...");
      const response = await fetch("/api/auth", {
        method: "GET",
      });
      
      console.log("GoogleStep: Auth API response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("GoogleStep: Auth API response data:", data);
        
        if (data.authUrl) {
          console.log("GoogleStep: Redirecting to Google OAuth URL:", data.authUrl);
          window.location.href = data.authUrl;
        } else {
          console.error("GoogleStep: No authUrl in response:", data);
          setConnectionStatus("error");
        }
      } else {
        console.error("GoogleStep: Auth API failed:", response.status, response.statusText);
        const errorData = await response.text();
        console.error("GoogleStep: Auth API error data:", errorData);
        setConnectionStatus("error");
      }
    } catch (error) {
      console.error("GoogleStep: Error connecting to Google:", error);
      setConnectionStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      if (response.ok) {
        setConnectionStatus("idle");
        setGoogleAccount(null);
      }
    } catch (error) {
      console.error("Error disconnecting Google:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete({ connected: false });
  };

  const handleContinue = () => {
    onComplete({ connected: connectionStatus === "connected" });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
          <Link className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Connect Your Google Account
          </h2>
          <p className="text-muted-foreground">
            Unlock powerful integrations and automation features
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Shield className="w-3 h-3" />
          Optional Setup
        </Badge>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benefits.map((benefit, index) => (
          <Card key={index} className="border shadow-sm group hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 ${benefit.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <benefit.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connection Status Card */}
      <Card className="border shadow-lg">
        <CardContent className="p-8">
          {connectionStatus === "idle" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Ready to Connect</h3>
                <p className="text-muted-foreground">
                  Connect your Google account to unlock advanced features
                </p>
              </div>
              <Button
                onClick={connectGoogle}
                disabled={isLoading}
                size="lg"
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Connect Google Account
                  </>
                )}
              </Button>
            </div>
          )}

          {connectionStatus === "connecting" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 mx-auto" />
                <Skeleton className="h-4 w-80 mx-auto" />
              </div>
            </div>
          )}

          {connectionStatus === "connected" && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-primary">
                    Successfully Connected!
                  </h3>
                  {googleAccount && (
                    <p className="text-muted-foreground">
                      Connected to: <span className="font-medium">{googleAccount}</span>
                    </p>
                  )}
                </div>
              </div>
              
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-primary">
                        All features unlocked!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        You can now use Google integrations and automations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button
                variant="outline"
                onClick={disconnectGoogle}
                disabled={isLoading}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Disconnect Account
                  </>
                )}
              </Button>
            </div>
          )}

          {connectionStatus === "error" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-destructive">
                  Connection Failed
                </h3>
                <p className="text-muted-foreground">
                  We couldn't connect to your Google account. Please try again.
                </p>
              </div>
              <Button
                onClick={connectGoogle}
                disabled={isLoading}
                size="lg"
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Try Again
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="gap-2"
        >
          Skip for Now
        </Button>
        
        <Button
          onClick={handleContinue}
          size="lg"
          className="gap-2 min-w-[140px]"
        >
          {connectionStatus === "connected" ? (
            <>
              Continue
              <CheckCircle className="w-4 h-4" />
            </>
          ) : (
            <>
              Skip & Continue
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}