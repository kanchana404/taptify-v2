import React, { useState, useEffect } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";


export default function QRCodeTab() {
  const [qrUrl, setQrUrl] = useState("https://yourcompany.com/feedback");
  const [qrSize, setQrSize] = useState(200);
  const [qrColor, setQrColor] = useState("#6D28D9"); // Purple color
  const [qrBgColor, setQrBgColor] = useState("#FFFFFF");
  const [qrLevel, setQrLevel] = useState("M");
  const [businessName, setBusinessName] = useState("Your Business");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch the QR code data from the API
  useEffect(() => {
    const fetchQRData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/get-qr");
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.url) setQrUrl(data.url);
        if (data.businessName) setBusinessName(data.businessName);
      } catch (error) {
        console.error("Error fetching QR code data:", error);
        toast({
          title: "Error loading QR code data",
          description: "Using default values instead.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQRData();
  }, [toast]);

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      try {
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-review-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "QR Code Downloaded",
          description: "PNG file saved successfully.",
        });
      } catch (error) {
        console.error("Error downloading QR code:", error);
        toast({
          title: "Download failed",
          description: "Could not download the QR code.",
          variant: "destructive",
        });
      }
    }
  };

  const downloadSVG = () => {
    const svgEl = document.getElementById("qr-svg");
    if (svgEl) {
      try {
        // Get the SVG as a string
        const svgData = new XMLSerializer().serializeToString(svgEl);
        
        // Create a Blob from the SVG string
        const blob = new Blob([svgData], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        
        // Create a link and click it to trigger the download
        const link = document.createElement("a");
        link.href = url;
        link.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-review-qr.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "QR Code Downloaded",
          description: "SVG file saved successfully.",
        });
      } catch (error) {
        console.error("Error downloading SVG:", error);
        toast({
          title: "Download failed",
          description: "Could not download the SVG QR code.",
          variant: "destructive",
        });
      }
    }
  };

  const printQRCode = () => {
    try {
      // Create a new window with just the QR code
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${businessName} Review QR Code</title>
              <style>
                body { 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh;
                  font-family: Arial, sans-serif;
                }
                .container { 
                  text-align: center;
                  max-width: 400px;
                }
                .qr-code { 
                  margin-bottom: 20px;
                  display: flex;
                  justify-content: center;
                }
                .business-name { 
                  font-size: 18px; 
                  font-weight: bold; 
                  margin-bottom: 8px;
                }
                .url { 
                  font-size: 14px; 
                  color: #333;
                  word-break: break-all;
                  margin-top: 10px;
                }
                .scan-text {
                  font-size: 16px;
                  margin-top: 15px;
                  color: #555;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="business-name">${businessName}</div>
                <div class="qr-code">
                  ${document.getElementById("qr-svg")?.outerHTML || ""}
                </div>
                <div class="scan-text">Scan to leave a review</div>
                <div class="url">${qrUrl}</div>
              </div>
              <script>
                setTimeout(() => { window.print(); window.close(); }, 500);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        toast({
          title: "Print Failed",
          description: "Could not open print window. Pop-up blocker enabled?",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error printing QR code:", error);
      toast({
        title: "Print Failed",
        description: "Could not print the QR code.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qr-url">Review URL</Label>
            <Input 
              id="qr-url" 
              value={qrUrl} 
              onChange={(e) => setQrUrl(e.target.value)} 
              placeholder="https://yourcompany.com/feedback"
            />
            <p className="text-xs text-muted-foreground">
              This is the URL customers will be directed to when scanning the QR code.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input 
              id="business-name" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)} 
              placeholder="Your Business Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-size">QR Code Size</Label>
            <div className="flex items-center gap-2">
              <Input 
                id="qr-size" 
                type="number" 
                min="100" 
                max="500" 
                value={qrSize} 
                onChange={(e) => setQrSize(parseInt(e.target.value))}
              />
              <span className="text-sm text-muted-foreground">px</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-color">QR Code Color</Label>
            <div className="flex items-center gap-2">
              <Input 
                id="qr-color" 
                type="color" 
                value={qrColor} 
                onChange={(e) => setQrColor(e.target.value)}
                className="w-12 h-8 p-1"
              />
              <Input 
                type="text" 
                value={qrColor} 
                onChange={(e) => setQrColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-level">Error Correction Level</Label>
            <Select value={qrLevel} onValueChange={setQrLevel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Low (7%)</SelectItem>
                <SelectItem value="M">Medium (15%)</SelectItem>
                <SelectItem value="Q">Quartile (25%)</SelectItem>
                <SelectItem value="H">High (30%)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Higher correction levels make QR codes more resistant to damage but increase density.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={downloadQRCode} className="w-full bg-purple-700 hover:bg-purple-800">
              Download PNG
            </Button>
            <Button onClick={downloadSVG} variant="outline" className="w-full text-purple-700 border-purple-300 hover:bg-purple-50">
              Download SVG
            </Button>
            <Button onClick={printQRCode} variant="secondary" className="w-full">
              Print QR Code
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div style={{ display: "none" }}>
              <QRCodeSVG
                id="qr-svg"
                value={qrUrl}
                size={qrSize}
                fgColor={qrColor}
                bgColor={qrBgColor}
                level={qrLevel as "L" | "M" | "Q" | "H"}
                includeMargin={true}
              />
            </div>
            <QRCodeCanvas
              id="qr-canvas"
              value={qrUrl}
              size={qrSize}
              fgColor={qrColor}
              bgColor={qrBgColor}
              level={qrLevel as "L" | "M" | "Q" | "H"}
              includeMargin={true}
            />
          </div>
          <p className="text-sm font-medium">{businessName}</p>
          <p className="text-sm text-center text-muted-foreground">
            Scan this QR code to access our review form
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-muted/50">
        <h3 className="text-sm font-medium mb-2">About QR Codes for Reviews</h3>
        <p className="text-sm text-muted-foreground">
          Place these QR codes at your physical locations to make it easy for customers to leave reviews.
          Print them on receipts, display them on counters, or include them in packaging for maximum visibility.
        </p>
      </div>
    </div>
  );
}