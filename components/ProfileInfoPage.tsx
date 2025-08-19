"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building, User, Mail, Phone, MapPin, Globe, Clock, BookOpen, QrCode, Copy, CheckCircle, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeCanvas } from "qrcode.react";

export interface ProfileInfoData {
  company_name?: string;
  agent_name?: string;
  role?: string;
  company_contact_number?: string;
  company_contact_email?: string;
  company_contact_address?: string;
  product_or_service?: string;
  link?: string;
  user_timezone?: string;
  knowledge_base?: string;
}

export interface QRCodeData {
  url: string;
  businessName: string;
  instructionText: string;
  size: number;
  color: string;
  bgColor: string;
  showDetailsInPrint: boolean;
}

export default function ProfileInfoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [profileInfo, setProfileInfo] = useState<ProfileInfoData>({
    company_name: "",
    agent_name: "",
    role: "",
    company_contact_number: "",
    company_contact_email: "",
    company_contact_address: "",
    product_or_service: "",
    link: "",
    user_timezone: "",
    knowledge_base: "",
  });

  const [qrCodeData, setQrCodeData] = useState<QRCodeData>({
    url: "https://yourcompany.com/feedback",
    businessName: "Your Business",
    instructionText: "Scan this QR code to access our review form",
    size: 200,
    color: "#6D28D9",
    bgColor: "#FFFFFF",
    showDetailsInPrint: true,
  });

  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isQrSaving, setIsQrSaving] = useState(false);

  useEffect(() => {
    fetchProfileInfo();
    fetchQRCodeData();
  }, []);

  const fetchProfileInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/instructions');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data) {
          const companyData = data.company || {};
          const extraData = data.extra || {};
          
          const mappedProfileInfo = {
            company_name: companyData.company_name || "",
            agent_name: companyData.agent_name || "",
            role: extraData.role || "",
            company_contact_number: companyData.contact_number || "",
            company_contact_email: companyData.contact_email || "",
            company_contact_address: companyData.company_address || "",
            product_or_service: companyData.product_or_service || "",
            link: companyData.link || "",
            user_timezone: extraData.user_timezone || "",
            knowledge_base: extraData.knowledge_base || "",
          };
          
          setProfileInfo(mappedProfileInfo);
          
          // Sync QR code business name with company name
          if (companyData.company_name) {
            setQrCodeData(prev => ({ ...prev, businessName: companyData.company_name }));
          }
        }
      } else {
        console.error("Failed to fetch company data:", response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching profile info:', error);
      toast.error("Failed to load profile information");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQRCodeData = async () => {
    try {
      // Fetch QR code data
      const qrRes = await fetch("/api/get-qr");
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        if (qrData.url) {
          setQrCodeData(prev => ({ ...prev, url: qrData.url }));
        }
        // Don't override business name here as it should come from profile info
      }

      // Fetch QR settings
      const settingsRes = await fetch("/api/other-info");
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if (settings.qr_instruction_text) {
          setQrCodeData(prev => ({ ...prev, instructionText: settings.qr_instruction_text }));
        }
      }
    } catch (err) {
      console.error("Error loading QR code data:", err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "company",
          company_name: profileInfo.company_name,
          agent_name: profileInfo.agent_name,
          company_contact_number: profileInfo.company_contact_number,
          company_contact_email: profileInfo.company_contact_email,
          company_contact_address: profileInfo.company_contact_address,
          product_or_service: profileInfo.product_or_service,
          link: profileInfo.link,
          role: profileInfo.role,
          user_timezone: profileInfo.user_timezone,
          knowledge_base: profileInfo.knowledge_base,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.message) {
          toast.success(result.message);
        } else {
          toast.success("Profile information saved successfully");
        }
        
        // Ensure QR code business name is synced with the saved company name
        // This ensures both database tables (company_data and review_links) are in sync
        setQrCodeData(prev => ({ ...prev, businessName: profileInfo.company_name || "" }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile information');
      }
    } catch (error) {
      console.error('Error saving profile info:', error);
      toast.error("Failed to save profile information");
    } finally {
      setIsSaving(false);
    }
  };

  const saveBusinessName = async () => {
    if (!qrCodeData.businessName.trim()) {
      toast.error("Business name cannot be empty.");
      return;
    }
    setIsQrSaving(true);
    try {
      // Update both company_data and review_links tables simultaneously
      const res = await fetch("/api/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "company",
          company_name: qrCodeData.businessName 
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      
      // Update profile info company name to stay in sync
      setProfileInfo(prev => ({ ...prev, company_name: qrCodeData.businessName }));
      
      toast.success("Business name saved to both company profile and QR settings.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save business name.");
    } finally {
      setIsQrSaving(false);
    }
  };

  const saveQrInstructionText = async () => {
    if (!qrCodeData.instructionText.trim()) {
      toast.error("Instruction text cannot be empty.");
      return;
    }
    setIsQrSaving(true);
    try {
      const res = await fetch("/api/other-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_instruction_text: qrCodeData.instructionText }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      toast.success("Instruction text saved.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save instruction text.");
    } finally {
      setIsQrSaving(false);
    }
  };

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeData.url);
      setCopied(true);
      toast.success("Review URL copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed. Try manually.");
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${qrCodeData.businessName.replace(/\s+/g, "-").toLowerCase()}-review-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR Code Downloaded");
    } catch {
      toast.error("Could not download QR code.");
    }
  };

  const printQRCode = () => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Popup blocked");
      printWindow.document.write(`
        <html><head><title>${qrCodeData.businessName} QR</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
          <img src="${(
          document.getElementById("qr-canvas") as HTMLCanvasElement
        ).toDataURL()}" alt="QR" />
        </body>
        <script>setTimeout(()=>{window.print();window.close()},500);</script>
        </html>
      `);
      printWindow.document.close();
    } catch {
      toast.error("Could not open print dialog.");
    }
  };

  const handleInputChange = (field: keyof ProfileInfoData, value: string) => {
    setProfileInfo(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // If company name changes, sync it with QR code business name immediately
    if (field === 'company_name') {
      setQrCodeData(prev => ({ ...prev, businessName: value }));
    }
  };

  const handleQRInputChange = (field: keyof QRCodeData, value: any) => {
    setQrCodeData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // If business name changes in QR tab, sync it with profile company name immediately
    if (field === 'businessName') {
      setProfileInfo(prev => ({ ...prev, company_name: value }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Profile Information
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-medium">
                    Company Name *
                  </Label>
                  <Input
                    id="company_name"
                    value={profileInfo.company_name || ""}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    placeholder="Enter your company name"
                  />
                </div>

                {/* Agent Name */}
                <div className="space-y-2">
                  <Label htmlFor="agent_name" className="text-sm font-medium">
                    Agent Name
                  </Label>
                  <Input
                    id="agent_name"
                    value={profileInfo.agent_name || ""}
                    onChange={(e) => handleInputChange('agent_name', e.target.value)}
                    placeholder="Enter agent name"
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Role
                  </Label>
                  <Input
                    id="role"
                    value={profileInfo.role || ""}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    placeholder="Enter role or title"
                  />
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                  <Label htmlFor="company_contact_email" className="text-sm font-medium">
                    Contact Email
                  </Label>
                  <Input
                    id="company_contact_email"
                    type="email"
                    value={profileInfo.company_contact_email || ""}
                    onChange={(e) => handleInputChange('company_contact_email', e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="company_contact_number" className="text-sm font-medium">
                    Contact Number
                  </Label>
                  <Input
                    id="company_contact_number"
                    value={profileInfo.company_contact_number || ""}
                    onChange={(e) => handleInputChange('company_contact_number', e.target.value)}
                    placeholder="Enter contact number"
                  />
                </div>

                {/* Contact Address */}
                <div className="space-y-2">
                  <Label htmlFor="company_contact_address" className="text-sm font-medium">
                    Contact Address
                  </Label>
                  <Input
                    id="company_contact_address"
                    value={profileInfo.company_contact_address || ""}
                    onChange={(e) => handleInputChange('company_contact_address', e.target.value)}
                    placeholder="Enter contact address"
                  />
                </div>

                {/* Product or Service */}
                <div className="space-y-2">
                  <Label htmlFor="product_or_service" className="text-sm font-medium">
                    Product or Service
                  </Label>
                  <Input
                    id="product_or_service"
                    value={profileInfo.product_or_service || ""}
                    onChange={(e) => handleInputChange('product_or_service', e.target.value)}
                    placeholder="Enter your main product or service"
                  />
                </div>

                {/* Website Link */}
                <div className="space-y-2">
                  <Label htmlFor="link" className="text-sm font-medium">
                    Website Link
                  </Label>
                  <Input
                    id="link"
                    value={profileInfo.link || ""}
                    onChange={(e) => handleInputChange('link', e.target.value)}
                    placeholder="Enter your website URL"
                  />
                </div>
              </div>

              {/* User Timezone - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="user_timezone" className="text-sm font-medium">
                  Timezone
                </Label>
                <Select 
                  value={profileInfo.user_timezone || ""} 
                  onValueChange={(value) => handleInputChange('user_timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC-12">UTC-12 (Baker Island, Howland Island)</SelectItem>
                    <SelectItem value="UTC-11">UTC-11 (American Samoa, Niue)</SelectItem>
                    <SelectItem value="UTC-10">UTC-10 (Hawaii, Tahiti)</SelectItem>
                    <SelectItem value="UTC-9">UTC-9 (Alaska)</SelectItem>
                    <SelectItem value="UTC-8">UTC-8 (Pacific Time)</SelectItem>
                    <SelectItem value="UTC-7">UTC-7 (Mountain Time)</SelectItem>
                    <SelectItem value="UTC-6">UTC-6 (Central Time)</SelectItem>
                    <SelectItem value="UTC-5">UTC-5 (Eastern Time)</SelectItem>
                    <SelectItem value="UTC-4">UTC-4 (Atlantic Time)</SelectItem>
                    <SelectItem value="UTC-3">UTC-3 (Brazil, Argentina)</SelectItem>
                    <SelectItem value="UTC-2">UTC-2 (South Georgia)</SelectItem>
                    <SelectItem value="UTC-1">UTC-1 (Azores, Cape Verde)</SelectItem>
                    <SelectItem value="UTC+0">UTC+0 (London, Lisbon)</SelectItem>
                    <SelectItem value="UTC+1">UTC+1 (Paris, Berlin)</SelectItem>
                    <SelectItem value="UTC+2">UTC+2 (Cairo, Helsinki)</SelectItem>
                    <SelectItem value="UTC+3">UTC+3 (Moscow, Istanbul)</SelectItem>
                    <SelectItem value="UTC+4">UTC+4 (Dubai, Baku)</SelectItem>
                    <SelectItem value="UTC+5">UTC+5 (Tashkent, Karachi)</SelectItem>
                    <SelectItem value="UTC+5:30">UTC+5:30 (India, Sri Lanka)</SelectItem>
                    <SelectItem value="UTC+6">UTC+6 (Dhaka, Almaty)</SelectItem>
                    <SelectItem value="UTC+7">UTC+7 (Bangkok, Jakarta)</SelectItem>
                    <SelectItem value="UTC+8">UTC+8 (Beijing, Singapore)</SelectItem>
                    <SelectItem value="UTC+9">UTC+9 (Tokyo, Seoul)</SelectItem>
                    <SelectItem value="UTC+10">UTC+10 (Sydney, Melbourne)</SelectItem>
                    <SelectItem value="UTC+11">UTC+11 (Solomon Islands)</SelectItem>
                    <SelectItem value="UTC+12">UTC+12 (New Zealand, Fiji)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Knowledge Base - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="knowledge_base" className="text-sm font-medium">
                  Knowledge Base
                </Label>
                <Textarea
                  id="knowledge_base"
                  value={profileInfo.knowledge_base || ""}
                  onChange={(e) => handleInputChange('knowledge_base', e.target.value)}
                  placeholder="Enter your knowledge base, company policies, or any specific information that should be shared with customers..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Save Button */}
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile Information'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Settings Column */}
                <div className="space-y-4">
                  {/* Review URL */}
                  <div className="space-y-2">
                    <Label htmlFor="qr-url" className="text-sm font-medium">Review URL</Label>
                    <div className="relative">
                      <Input
                        id="qr-url"
                        value={qrCodeData.url}
                        readOnly
                        className="pr-12 bg-gray-100 dark:bg-gray-800"
                      />
                      <Button
                        onClick={copyUrlToClipboard}
                        disabled={!qrCodeData.url}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 ${
                          copied
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-purple-600 hover:bg-purple-700"
                        } text-white`}
                        size="sm"
                        title={copied ? "Copied!" : "Copy URL"}
                      >
                        {copied ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Business Name */}
                  <div className="space-y-2">
                    <Label htmlFor="business-name" className="text-sm font-medium">Business Name</Label>
                    <div className="relative">
                      <Input
                        id="business-name"
                        value={qrCodeData.businessName}
                        onChange={(e) => handleQRInputChange('businessName', e.target.value)}
                        className="pr-20"
                      />
                      <Button
                        onClick={saveBusinessName}
                        disabled={isQrSaving || !qrCodeData.businessName.trim()}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                      >
                        {isQrSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Instruction Text */}
                  <div className="space-y-2">
                    <Label htmlFor="qr-instruction-text" className="text-sm font-medium">QR Instruction Text</Label>
                    <div className="relative">
                      <Input
                        id="qr-instruction-text"
                        value={qrCodeData.instructionText}
                        onChange={(e) => handleQRInputChange('instructionText', e.target.value)}
                        className="pr-20"
                      />
                      <Button
                        onClick={saveQrInstructionText}
                        disabled={isQrSaving || !qrCodeData.instructionText.trim()}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                      >
                        {isQrSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* QR Code Size */}
                  <div className="space-y-2">
                    <Label htmlFor="qr-size" className="text-sm font-medium">QR Code Size</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="qr-size"
                        type="number"
                        min={100}
                        max={300}
                        value={qrCodeData.size}
                        onChange={(e) => handleQRInputChange('size', parseInt(e.target.value))}
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>

                  {/* QR Code Color */}
                  <div className="space-y-2">
                    <Label htmlFor="qr-color" className="text-sm font-medium">QR Code Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="qr-color"
                        type="color"
                        value={qrCodeData.color}
                        onChange={(e) => handleQRInputChange('color', e.target.value)}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        type="text"
                        value={qrCodeData.color}
                        onChange={(e) => handleQRInputChange('color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Print Details toggle */}
                  <div className="space-y-2">
                    <Label htmlFor="print-details" className="text-sm font-medium">Print Details</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="print-details"
                        checked={qrCodeData.showDetailsInPrint}
                        onCheckedChange={(checked) => handleQRInputChange('showDetailsInPrint', checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {qrCodeData.showDetailsInPrint ? "Show name & text" : "QR only"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={downloadQRCode}
                      className="w-full bg-purple-700 hover:bg-purple-800"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download QR
                    </Button>
                    <Button
                      onClick={printQRCode}
                      variant="secondary"
                      className="w-full"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print QR Code
                    </Button>
                  </div>
                </div>

                {/* Preview Column */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-6 border rounded-lg shadow-sm">
                    <QRCodeCanvas
                      id="qr-canvas"
                      value={qrCodeData.url}
                      size={qrCodeData.size}
                      fgColor={qrCodeData.color}
                      bgColor={qrCodeData.bgColor}
                      includeMargin
                      level="M"
                    />
                  </div>
                  <p className="text-sm font-medium text-center">{qrCodeData.businessName}</p>
                  <p className="text-xs text-center text-muted-foreground">{qrCodeData.instructionText}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Information */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h3 className="text-sm font-medium">Using QR Codes</h3>
                <p className="text-sm text-muted-foreground">
                  Display these QR codes on receipts, counters or packaging so customers can quickly leave a review.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}