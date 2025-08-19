import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { QrCode, Download, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeTabProps {
  selectedLocation: string;
  selectedAccount: string;
}

const QRCodeTab: React.FC<QRCodeTabProps> = ({ selectedLocation, selectedAccount }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState<string>('');

  useEffect(() => {
    if (selectedLocation) {
      const id = selectedLocation.split('/').pop();
      setLocationId(id || '');
    }
  }, [selectedLocation]);

  const generateQRCode = async () => {
    if (!locationId) {
      toast.error('Please select a location first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/get-qr?locationId=${locationId}`);
      if (response.ok) {
        const data = await response.json();
        setQrCodeUrl(data.qrCodeUrl || '');
        toast.success('QR Code generated successfully');
      } else {
        toast.error('Failed to generate QR Code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR Code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) {
      toast.error('No QR Code to download');
      return;
    }

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-code-${locationId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded');
  };

  const copyQRCodeUrl = () => {
    if (!qrCodeUrl) {
      toast.error('No QR Code URL to copy');
      return;
    }

    navigator.clipboard.writeText(qrCodeUrl);
    toast.success('QR Code URL copied to clipboard');
  };

  if (!selectedLocation) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              QR Code Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <QrCode className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Location Selected</h3>
              <p className="text-muted-foreground">
                Please select a business location to generate QR codes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            QR Code Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="locationId">Location ID</Label>
              <Input
                id="locationId"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="Enter location ID"
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={generateQRCode}
                disabled={loading || !locationId}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Generating...' : 'Generate QR Code'}
              </Button>
            </div>
          </div>

          {qrCodeUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Generated QR Code</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={downloadQRCode}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={copyQRCodeUrl}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy URL
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="border rounded-lg shadow-sm"
                  style={{ maxWidth: '300px', maxHeight: '300px' }}
                />
              </div>
            </div>
          )}

          {!qrCodeUrl && !loading && (
            <div className="text-center py-8">
              <QrCode className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No QR Code Generated</h3>
              <p className="text-muted-foreground">
                Click "Generate QR Code" to create a QR code for this location
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <Skeleton className="mx-auto h-48 w-48 rounded-lg mb-4" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QRCodeTab; 