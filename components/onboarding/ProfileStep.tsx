"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Mail, Phone, MapPin, Globe, Loader2, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileData {
  company_name: string;
  agent_name: string;
  role: string;
  contact_number: string;
  contact_email: string;
  company_address: string;
  product_or_service: string;
  link: string;
  user_timezone: string;
  knowledge_base: string;
}

interface ProfileStepProps {
  onComplete: (data: ProfileData) => void;
  initialData?: Partial<ProfileData>;
}

export default function ProfileStep({ onComplete, initialData = {} }: ProfileStepProps) {
  const [formData, setFormData] = useState<ProfileData>({
    company_name: "",
    agent_name: "",
    role: "",
    contact_number: "",
    contact_email: "",
    company_address: "",
    product_or_service: "",
    link: "",
    user_timezone: "",
    knowledge_base: "",
    ...initialData,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Load existing company data when component mounts
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        console.log("Loading company data...");
        const response = await fetch("/api/instructions");
        console.log("Response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("API Response data:", data);
          
          if (data) {
            console.log("Setting form data with:", data);
            const newFormData = {
              company_name: data.company_name || "",
              agent_name: data.agent_name || "",
              role: data.role || "",
              contact_number: data.company_contact_number || "",
              contact_email: data.company_contact_email || "",
              company_address: data.company_contact_address || "",
              product_or_service: data.product_or_service || "",
              link: data.link || "",
              user_timezone: data.user_timezone || "",
              knowledge_base: data.knowledge_base || "",
            };
            console.log("New form data:", newFormData);
            setFormData(newFormData);
          } else {
            console.log("No data found in response");
          }
        } else {
          console.error("Failed to load company data:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("Error loading company data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanyData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "company",
          company_name: formData.company_name,
          agent_name: formData.agent_name,
          company_contact_number: formData.contact_number,
          company_contact_email: formData.contact_email,
          company_contact_address: formData.company_address,
          product_or_service: formData.product_or_service,
          link: formData.link,
          role: formData.role,
          user_timezone: formData.user_timezone,
          knowledge_base: formData.knowledge_base,
        }),
      });

      if (response.ok) {
        onComplete(formData);
      } else {
        console.error("Failed to save profile data");
      }
    } catch (error) {
      console.error("Error saving profile data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return (
      formData.company_name.trim() &&
      formData.agent_name.trim() &&
      formData.contact_number.trim() &&
      formData.contact_email.trim()
    );
  };

  const getCompletionPercentage = () => {
    const fields = Object.values(formData);
    const filledFields = fields.filter(field => field && field.trim()).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="text-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-2xl mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-4 w-80 mx-auto" />
          </div>
        </div>

        {/* Progress Skeleton */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>

        {/* Form Skeleton */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>

        {/* Button Skeleton */}
        <div className="flex justify-center pt-6">
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
          <User className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Tell us about your business
          </h2>
          <p className="text-muted-foreground">
            This helps us personalize your experience and set up your AI assistant
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs">
            {getCompletionPercentage()}% Complete
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Essential Information */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Essential Information</h3>
                <p className="text-sm text-muted-foreground">Required details to get started</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company_name" className="text-sm font-medium">
                  Company Name *
                </Label>
                <div className="relative">
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange("company_name", e.target.value)}
                    onFocus={() => setFocusedField("company_name")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your company name"
                    className={`transition-all duration-200 ${
                      focusedField === "company_name" ? "ring-2 ring-primary/20 border-primary" : ""
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent_name" className="text-sm font-medium">
                  Agent Name *
                </Label>
                <div className="relative">
                  <Input
                    id="agent_name"
                    value={formData.agent_name}
                    onChange={(e) => handleInputChange("agent_name", e.target.value)}
                    onFocus={() => setFocusedField("agent_name")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your full name"
                    className={`transition-all duration-200 ${
                      focusedField === "agent_name" ? "ring-2 ring-primary/20 border-primary" : ""
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  Your Role
                </Label>
                <div className="relative">
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => handleInputChange("role", e.target.value)}
                    onFocus={() => setFocusedField("role")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g., CEO, Manager, Owner"
                    className={`transition-all duration-200 ${
                      focusedField === "role" ? "ring-2 ring-primary/20 border-primary" : ""
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email" className="text-sm font-medium">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange("contact_email", e.target.value)}
                    onFocus={() => setFocusedField("contact_email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="your@email.com"
                    className={`pl-10 transition-all duration-200 ${
                      focusedField === "contact_email" ? "ring-2 ring-primary/20 border-primary" : ""
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_number" className="text-sm font-medium">
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="contact_number"
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) => handleInputChange("contact_number", e.target.value)}
                    onFocus={() => setFocusedField("contact_number")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="+1 (555) 123-4567"
                    className={`pl-10 transition-all duration-200 ${
                      focusedField === "contact_number" ? "ring-2 ring-primary/20 border-primary" : ""
                    }`}
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-secondary/50 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Additional Details</h3>
                <p className="text-sm text-muted-foreground">Optional information to enhance your profile</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="product_or_service" className="text-sm font-medium">
                    Product/Service
                  </Label>
                  <Input
                    id="product_or_service"
                    value={formData.product_or_service}
                    onChange={(e) => handleInputChange("product_or_service", e.target.value)}
                    onFocus={() => setFocusedField("product_or_service")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="What do you offer?"
                    className={`transition-all duration-200 ${
                      focusedField === "product_or_service" ? "ring-2 ring-primary/20 border-primary" : ""
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link" className="text-sm font-medium">
                    Website
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="link"
                      type="url"
                      value={formData.link}
                      onChange={(e) => handleInputChange("link", e.target.value)}
                      onFocus={() => setFocusedField("link")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="https://yourwebsite.com"
                      className={`pl-10 transition-all duration-200 ${
                        focusedField === "link" ? "ring-2 ring-primary/20 border-primary" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_address" className="text-sm font-medium">
                  Business Address
                </Label>
                <Textarea
                  id="company_address"
                  value={formData.company_address}
                  onChange={(e) => handleInputChange("company_address", e.target.value)}
                  onFocus={() => setFocusedField("company_address")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your business address"
                  className={`resize-none transition-all duration-200 ${
                    focusedField === "company_address" ? "ring-2 ring-primary/20 border-primary" : ""
                  }`}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_timezone" className="text-sm font-medium">
                  Your Timezone
                </Label>
                <select
                  id="user_timezone"
                  value={formData.user_timezone}
                  onChange={(e) => handleInputChange("user_timezone", e.target.value)}
                  onFocus={() => setFocusedField("user_timezone")}
                  onBlur={() => setFocusedField(null)}
                  aria-label="Select your timezone"
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${
                    focusedField === "user_timezone" ? "ring-2 ring-primary/20 border-primary" : ""
                  }`}
                >
                  <option value="">Select your timezone</option>
                  <option value="UTC-12">UTC-12 (Baker Island, Howland Island)</option>
                  <option value="UTC-11">UTC-11 (American Samoa, Niue)</option>
                  <option value="UTC-10">UTC-10 (Hawaii, Tahiti)</option>
                  <option value="UTC-9">UTC-9 (Alaska)</option>
                  <option value="UTC-8">UTC-8 (Pacific Time)</option>
                  <option value="UTC-7">UTC-7 (Mountain Time)</option>
                  <option value="UTC-6">UTC-6 (Central Time)</option>
                  <option value="UTC-5">UTC-5 (Eastern Time)</option>
                  <option value="UTC-4">UTC-4 (Atlantic Time)</option>
                  <option value="UTC-3">UTC-3 (Brazil, Argentina)</option>
                  <option value="UTC-2">UTC-2 (South Georgia)</option>
                  <option value="UTC-1">UTC-1 (Azores, Cape Verde)</option>
                  <option value="UTC+0">UTC+0 (London, Lisbon)</option>
                  <option value="UTC+1">UTC+1 (Paris, Berlin)</option>
                  <option value="UTC+2">UTC+2 (Cairo, Helsinki)</option>
                  <option value="UTC+3">UTC+3 (Moscow, Istanbul)</option>
                  <option value="UTC+4">UTC+4 (Dubai, Baku)</option>
                  <option value="UTC+5">UTC+5 (Tashkent, Karachi)</option>
                  <option value="UTC+5:30">UTC+5:30 (India, Sri Lanka)</option>
                  <option value="UTC+6">UTC+6 (Dhaka, Almaty)</option>
                  <option value="UTC+7">UTC+7 (Bangkok, Jakarta)</option>
                  <option value="UTC+8">UTC+8 (Beijing, Singapore)</option>
                  <option value="UTC+9">UTC+9 (Tokyo, Seoul)</option>
                  <option value="UTC+10">UTC+10 (Sydney, Melbourne)</option>
                  <option value="UTC+11">UTC+11 (Solomon Islands)</option>
                  <option value="UTC+12">UTC+12 (New Zealand, Fiji)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Knowledge Base</h3>
                <p className="text-sm text-muted-foreground">Information that helps your AI assistant understand your business</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="knowledge_base" className="text-sm font-medium">
                Company Knowledge & Policies
              </Label>
              <Textarea
                id="knowledge_base"
                value={formData.knowledge_base}
                onChange={(e) => handleInputChange("knowledge_base", e.target.value)}
                onFocus={() => setFocusedField("knowledge_base")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your company policies, procedures, FAQs, or any specific information that should be shared with customers. This helps your AI assistant provide accurate and helpful responses."
                className={`resize-none transition-all duration-200 ${
                  focusedField === "knowledge_base" ? "ring-2 ring-primary/20 border-primary" : ""
                }`}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Examples: Return policies, business hours, service areas, common questions, company values, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            size="lg"
            className="min-w-[140px] gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}