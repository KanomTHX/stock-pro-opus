import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, X, ScanLine } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startScanner = useCallback(async () => {
    // Wait for DOM element to be ready
    const element = document.getElementById("barcode-reader");
    if (!element) {
      console.log("Waiting for barcode-reader element...");
      return;
    }

    try {
      setError(null);
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777,
        },
        (decodedText) => {
          onScan(decodedText);
          // Don't stop - allow continuous scanning
        },
        () => {
          // Ignore scan failures
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error("Scanner error:", err);
      setError(err.message || "ไม่สามารถเปิดกล้องได้");
      setIsScanning(false);
    }
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsReady(false);
  }, []);

  // Handle dialog open state
  useEffect(() => {
    if (open) {
      setIsReady(true);
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [open, stopScanner]);

  // Start scanner when ready and DOM element exists
  useEffect(() => {
    if (isReady && open && !isScanning) {
      // Use timeout to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isReady, open, isScanning, startScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            สแกน Serial Number
          </DialogTitle>
          <DialogDescription>
            หันกล้องไปที่บาร์โค้ดหรือ QR Code ของ Serial Number
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div 
            className="relative overflow-hidden rounded-lg bg-black min-h-[200px]"
          >
            <div id="barcode-reader" className="w-full" />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-primary rounded-lg flex items-center justify-center">
                  <ScanLine className="w-full h-1 text-primary animate-pulse" />
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
          
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="w-4 h-4 mr-2" />
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
