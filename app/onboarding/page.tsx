"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ProfileStep from "@/components/onboarding/ProfileStep";
import VoiceStep from "@/components/onboarding/VoiceStep";
import GoogleStep from "@/components/onboarding/GoogleStep";

const steps = [
  { 
    id: "profile", 
    title: "Profile", 
    description: "Tell us about yourself",
    emoji: "👤"
  },
  { 
    id: "voice", 
    title: "Voice", 
    description: "Choose your AI voice",
    emoji: "🎙️"
  },
  { 
    id: "google", 
    title: "Connect", 
    description: "Link your Google account",
    emoji: "🔗"
  },
];

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState({
    profile: {},
    voice: null,
    googleConnected: false,
  });

  useEffect(() => {
    if (isLoaded && user) {
      checkOnboardingStatus();
    }
  }, [isLoaded, user]);

  // Check if user is returning from Google OAuth
  useEffect(() => {
    if (isLoaded && user && !isLoading) {
      const authSuccess = searchParams.get('auth');
      if (authSuccess === 'success') {
        // User just returned from successful Google OAuth
        console.log('User returned from Google OAuth, checking onboarding status...');
        checkOnboardingStatus();
      }
    }
  }, [isLoaded, user, isLoading, searchParams]);

  const checkOnboardingStatus = async () => {
    try {
      console.log("Checking onboarding status...");
      const response = await fetch("/api/onboarding/status");
      if (response.ok) {
        const data = await response.json();
        console.log("Onboarding status data:", data);
        
        // If onboarding is completed, redirect to home page
        if (data.onboarding_completed) {
          console.log('Onboarding completed, redirecting to home page');
          router.push("/");
          return;
        }
        
        // If user has completed all steps including Google, complete onboarding
        if (data.profile_completed && data.voice_selected && data.google_connected) {
          console.log('All steps completed, completing onboarding...');
          await completeOnboarding();
          return;
        }
        
        setCompletedSteps(data.completed_steps || []);
        setCurrentStep(data.current_step_index || 0);
        console.log("Set current step to:", data.current_step_index || 0);
        
        // Update local state to reflect Google connection status
        setOnboardingData(prev => ({
          ...prev,
          googleConnected: data.google_connected || false
        }));
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStep = async (stepId: string, data: any) => {
    try {
      const response = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepId, data }),
      });

      if (response.ok) {
        setCompletedSteps(prev => [...new Set([...prev, stepId])]);
        setOnboardingData(prev => ({ ...prev, [stepId]: data }));
        
        // If this is the last step or if we're on the last step, complete onboarding
        if (currentStep === steps.length - 1 || stepId === "google") {
          await completeOnboarding();
        } else if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      }
    } catch (error) {
      console.error("Error updating step:", error);
    }
  };

  const completeOnboarding = async () => {
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/");
      } else {
        console.error("Failed to complete onboarding:", response.status, response.statusText);
        // If completion fails, still redirect to main page
        router.push("/");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // If there's an error, still redirect to main page
      router.push("/");
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= completedSteps.length) {
      setCurrentStep(stepIndex);
    }
  };

  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) return "completed";
    if (steps[currentStep].id === stepId) return "current";
    return "pending";
  };

  const progress = (completedSteps.length / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Getting Started
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Welcome aboard
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Let's personalize your experience in just a few simple steps
          </p>
        </div>

        {/* Progress Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {steps.length}
            </span>
            <Badge variant="secondary" className="text-xs">
              {completedSteps.length} completed
            </Badge>
          </div>
          <Progress value={progress} className="h-2 mb-8" />
          
          {/* Steps Indicator */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => goToStep(index)}
                    disabled={index > completedSteps.length}
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
                      getStepStatus(step.id) === "completed"
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : getStepStatus(step.id) === "current"
                        ? "bg-primary/10 text-primary border-2 border-primary shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {getStepStatus(step.id) === "completed" ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span>{step.emoji}</span>
                    )}
                    {getStepStatus(step.id) === "current" && (
                      <div className="absolute -inset-1 rounded-full border-2 border-primary animate-pulse"></div>
                    )}
                  </button>
                  <div className="mt-3 text-center">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-px bg-border mx-6 mt-6" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-lg border">
          <div className="p-8">
            {currentStep === 0 && (
              <>
                {console.log("Rendering ProfileStep component")}
                <ProfileStep
                  onComplete={(data) => updateStep("profile", data)}
                  initialData={onboardingData.profile}
                />
              </>
            )}
            {currentStep === 1 && (
              <>
                {console.log("Rendering VoiceStep component")}
                <VoiceStep
                  onComplete={(data) => updateStep("voice", data)}
                  initialData={onboardingData.voice}
                />
              </>
            )}
            {currentStep === 2 && (
              <>
                {console.log("Rendering GoogleStep component")}
                <GoogleStep
                  onComplete={(data) => updateStep("google", data)}
                  isConnected={onboardingData.googleConnected}
                />
              </>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>
          
          {currentStep < steps.length - 1 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!completedSteps.includes(steps[currentStep].id)}
              className="gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}