"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QrCode, Loader2, Copy, CheckCircle } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { QRCodeCanvas } from "qrcode.react";

import RequestReviewTab from "@/components/RequestReviewTab";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/* -------------------------------------------------------------------------- */
/*  OUTER TABS                                                                */
/* -------------------------------------------------------------------------- */
const OUTER_TABS = ["Request Review", "QR Code"] as const;
type OuterTab = (typeof OUTER_TABS)[number];

/* -------------------------------------------------------------------------- */
/*  PAGE WRAPPER                                                              */
/* -------------------------------------------------------------------------- */
export default function ReviewManagementPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewManagementPageContent />
      <Toaster />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/*  TYPES                                                                     */
/* -------------------------------------------------------------------------- */
export interface InstructionsData {
  company_name?: string;
  agent_name?: string;
  role?: string;
  company_contact_number?: string;
  company_contact_email?: string;
  company_contact_address?: string;
  experience_last_visit?: string;
  product_or_service?: string;
  link?: string;

  first_message_prompt?: string;
  reschedule_first_message_prompt?: string;
  role_prompt?: string;
  context_prompt?: string;
  task_prompt?: string;
  specifics_prompt?: string;
  conversation_flow_prompt?: string;
  sample_dialogue_prompt?: string;
  key_points_prompt?: string;
  link_prompt?: string;
  after_call_prompt?: string;

  knowledge_base?: string;
  any_additional_requests?: string;
  user_timezone?: string;
}

/* -------------------------------------------------------------------------- */
/*  MAIN COMPONENT                                                            */
/* -------------------------------------------------------------------------- */
function ReviewManagementPageContent() {

  const { isLoaded, userId, isSignedIn } = useAuth();

  /* --------------------------- URL parameters --------------------------- */
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlTabRaw = decodeURIComponent(searchParams.get("tab") ?? "");
  const sectionParam = searchParams.get("section");
  const typeParam = searchParams.get("type");

  const inboundOnly = typeParam === "inbound";
  const outboundOnly = typeParam === "outbound";

  const showOnlyRequestAndQR =
    urlTabRaw.toLowerCase() === "request review" ||
    urlTabRaw.toLowerCase() === "qr code" ||
    (!urlTabRaw && !sectionParam && !typeParam);

  /* Determine initial tab */
  let initialOuter: OuterTab = "Request Review";
  if (urlTabRaw && OUTER_TABS.includes(urlTabRaw as OuterTab)) {
    initialOuter = urlTabRaw as OuterTab;
  }

  const [outerTab, setOuterTab] = useState<OuterTab>(initialOuter);

  /* Sync state with URL */
  useEffect(() => {
    const raw = decodeURIComponent(searchParams.get("tab") ?? "");
    if (raw && OUTER_TABS.includes(raw as OuterTab) && raw !== outerTab) {
      setOuterTab(raw as OuterTab);
    }
  }, [searchParams, outerTab]);

  /* Push tab changes to URL */
  const handleOuterTabChange = (val: string) => {
    const safe = OUTER_TABS.find((t) => t === val) as OuterTab;
    if (!safe) return;

    setOuterTab(safe);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", safe.replace(" ", "%20"));
    url.searchParams.delete("section");
    url.searchParams.delete("type");
    router.replace(url.toString(), { scroll: false });
  };

  /* ---------------------- data state ---------------------- */
  const [instructions, setInstructions] = useState<InstructionsData>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      const fetchInstructions = async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/instructions");
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
          setInstructions(await res.json());
        } catch (err) {
          console.error("Error fetching instructions:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInstructions();
    }
  }, [isLoaded, isSignedIn, userId]);

  /* ------------------ theme overrides ------------------ */
  const customStyles = {
    "--primary": "270 70% 50%",
    "--ring": "270 70% 50%",
  } as any;

  /* -------------------------------------------------------------------------- */
  /*  QR CODE TAB STATE AND FUNCTIONS                                           */
  /* -------------------------------------------------------------------------- */
  const [qrUrl, setQrUrl] = useState("https://yourcompany.com/feedback");
  const [qrSize, setQrSize] = useState(200);
  const [qrColor, setQrColor] = useState("#6D28D9");
  const [qrBgColor, setQrBgColor] = useState("#FFFFFF");
  const [businessName, setBusinessName] = useState("Your Business");
  const [qrDataLoading, setQrDataLoading] = useState(true);
  const [showDetailsInPrint, setShowDetailsInPrint] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrInstructionText, setQrInstructionText] = useState(
    "Scan this QR code to access our review form"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isBusinessNameSaving, setIsBusinessNameSaving] = useState(false);
  const [isQrInstructionSaving, setIsQrInstructionSaving] = useState(false);



  /* Fetch QR code data */
  useEffect(() => {
    if (outerTab === "QR Code" && isLoaded && isSignedIn && userId) {
      const fetchQRData = async () => {
        try {
          setQrDataLoading(true);

          const qrRes = await fetch("/api/get-qr");
          if (!qrRes.ok) throw new Error(`Error ${qrRes.status}`);
          const qrData = await qrRes.json();
          if (qrData.url) setQrUrl(qrData.url);
          if (qrData.businessName) setBusinessName(qrData.businessName);

          const settingsRes = await fetch("/api/other-info");
          if (!settingsRes.ok) throw new Error(`Error ${settingsRes.status}`);
          const settings = await settingsRes.json();
          if (settings.qr_instruction_text)
            setQrInstructionText(settings.qr_instruction_text);
        } catch (err) {
          console.error(err);
          toast.error("Error loading QR code data. Using default values instead.");
        } finally {
          setQrDataLoading(false);
        }
      };
      fetchQRData();
    }
  }, [outerTab, isLoaded, isSignedIn, userId, toast]);

  const saveBusinessName = async () => {
    if (!businessName.trim()) {
      toast.error("Business name cannot be empty.");
      return;
    }
    setIsBusinessNameSaving(true);
    try {
      const res = await fetch("/api/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: businessName }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      toast.success("Business name saved.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save business name.");
    } finally {
      setIsBusinessNameSaving(false);
    }
  };

  const saveQrInstructionText = async () => {
    if (!qrInstructionText.trim()) {
              toast.error("Instruction text cannot be empty.");
      return;
    }
    setIsQrInstructionSaving(true);
    try {
      const res = await fetch("/api/other-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_instruction_text: qrInstructionText }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      toast.success("Instruction text saved.");
    } catch (err) {
      console.error(err);
              toast.error("Failed to save instruction text.");
    } finally {
      setIsQrInstructionSaving(false);
    }
  };

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
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
      link.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-review-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR Code Downloaded");
    } catch {
      toast.error("Download failed. Could not download QR code.");
    }
  };

  const printQRCode = () => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Popup blocked");
      printWindow.document.write(`
        <html><head><title>${businessName} QR</title></head>
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
      toast.error("Print failed. Could not open print dialog.");
    }
  };

  /* ---------------- auth loading / redirect ---------------- */
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="h-10 w-10 animate-spin border-4 border-purple-600 rounded-full border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h1 className="text-2xl font-bold text-purple-800 mb-4">
          Authentication Required
        </h1>
        <p className="text-gray-600 mb-6">
          You need to be signed in to access this page.
        </p>
        <button
          onClick={() => router.push("/sign-in")}
          className="bg-purple-700 text-white px-6 py-2 rounded-md hover:bg-purple-800"
        >
          Sign In
        </button>
      </div>
    );
  }

  /* ---------------- choose card header text ---------------- */
  const headerTitle =
    outerTab === "Request Review"
      ? "Request for Review"
      : outerTab === "QR Code"
        ? "QR Code"
        : null;

  const headerDescription =
    outerTab === "Request Review"
      ? "Request reviews your way: use AI-powered voice review or printable QR codes"
      : outerTab === "QR Code"
        ? "Generate printable QR codes so customers can leave reviews effortlessly"
        : null;

  /* ----------------------------------- RENDER ----------------------------------- */
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
        ...customStyles,
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col purple-fade-in">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Card className="mx-auto max-w-4xl purple-card">
                  {headerTitle && (
                    <CardHeader>
                      <CardTitle className="text-foreground">{headerTitle}</CardTitle>
                      {headerDescription && (
                        <CardDescription>
                          {headerDescription}
                        </CardDescription>
                      )}
                    </CardHeader>
                  )}

                  <CardContent>
                    <Tabs defaultValue={outerTab} value={outerTab} onValueChange={handleOuterTabChange}>
                      <TabsList className="bg-secondary/50 p-1 rounded-lg border border-purple-200 dark:border-purple-800">
                        <TabsTrigger value="Request Review" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all duration-200">
                          Request Review
                        </TabsTrigger>
                        <TabsTrigger value="QR Code" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all duration-200">
                          <QrCode className="mr-1 h-4 w-4" />
                          QR Code
                        </TabsTrigger>
                      </TabsList>

                        <TabsContent value="Request Review" className="space-y-6">
                          <RequestReviewTab />
                        </TabsContent>



                        <TabsContent value="QR Code" className="space-y-6">
                          {qrDataLoading ? (
                            <div className="flex justify-center items-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* ---------------- Settings & Preview ---------------- */}
                              <div className="grid gap-6 md:grid-cols-2">
                                {/* ---------- Settings ---------- */}
                                <div className="space-y-4">
                                  {/* Review URL */}
                                  <div className="space-y-2">
                                    <Label htmlFor="qr-url">Review URL</Label>
                                    <div className="relative">
                                      <Input
                                        id="qr-url"
                                        value={qrUrl}
                                        readOnly
                                        className="pr-12 bg-gray-100 dark:bg-gray-800"
                                      />
                                      <Button
                                        onClick={copyUrlToClipboard}
                                        disabled={!qrUrl}
                                        className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 ${copied
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
                                    <p className="text-xs text-muted-foreground">
                                      Customers are taken here when they scan the
                                      QR code.
                                    </p>
                                  </div>

                                  {/* Business Name */}
                                  <div className="space-y-2">
                                    <Label htmlFor="business-name">
                                      Business Name
                                    </Label>
                                    <div className="relative">
                                      <Input
                                        id="business-name"
                                        value={businessName}
                                        onChange={(e) =>
                                          setBusinessName(e.target.value)
                                        }
                                        className="pr-24"
                                      />
                                      <Button
                                        onClick={saveBusinessName}
                                        disabled={
                                          isBusinessNameSaving ||
                                          !businessName.trim()
                                        }
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white"
                                        size="sm"
                                      >
                                        {isBusinessNameSaving ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          "Save"
                                        )}
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      This name appears on the QR code.
                                    </p>
                                  </div>

                                  {/* QR Instruction Text */}
                                  <div className="space-y-2">
                                    <Label htmlFor="qr-instruction">
                                      QR Instruction Text
                                    </Label>
                                    <div className="relative">
                                      <Input
                                        id="qr-instruction"
                                        value={qrInstructionText}
                                        onChange={(e) =>
                                          setQrInstructionText(e.target.value)
                                        }
                                        className="pr-24"
                                        placeholder="Scan to leave a review"
                                      />
                                      <Button
                                        onClick={saveQrInstructionText}
                                        disabled={
                                          isQrInstructionSaving ||
                                          !qrInstructionText.trim()
                                        }
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white"
                                        size="sm"
                                      >
                                        {isQrInstructionSaving ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          "Save"
                                        )}
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Text that appears below the QR code.
                                    </p>
                                  </div>

                                  {/* QR Code Size */}
                                  <div className="space-y-2">
                                    <Label htmlFor="qr-size">QR Code Size</Label>
                                    <Select
                                      value={qrSize.toString()}
                                      onValueChange={(value) =>
                                        setQrSize(parseInt(value))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="128">Small (128px)</SelectItem>
                                        <SelectItem value="256">Medium (256px)</SelectItem>
                                        <SelectItem value="512">Large (512px)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      onClick={downloadQRCode}
                                      disabled={!qrUrl}
                                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                                    >
                                      Download QR Code
                                    </Button>
                                    <Button
                                      onClick={printQRCode}
                                      disabled={!qrUrl}
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      Print QR Code
                                    </Button>
                                  </div>
                                </div>

                                {/* ---------- Preview ---------- */}
                                <div className="space-y-4">
                                  <Label>QR Code Preview</Label>
                                  <div className="flex justify-center items-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                                    {qrUrl ? (
                                      <div className="text-center space-y-4">
                                        <QRCodeCanvas
                                          value={qrUrl}
                                          size={qrSize}
                                          level="M"
                                          includeMargin={true}
                                        />
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          <p className="font-medium">{businessName}</p>
                                          <p>{qrInstructionText}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-500 dark:text-gray-400">
                                        <QrCode className="mx-auto h-12 w-12 mb-2" />
                                        <p>QR code will appear here</p>
                                        <p className="text-sm">Enter a review URL first</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
