import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X } from "lucide-react";
import { useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

const SN_LENGTH_THRESHOLD = 12; // Use QR code for SNs longer than this

interface SNItem {
  sn: string;
  productName: string;
  productSku: string;
  color?: string;
}

interface SNLabelPrintProps {
  open: boolean;
  onClose: () => void;
  items: SNItem[];
}

// QR Code Preview component for the dialog
function QRCodePreview({ sn }: { sn: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(sn, {
      width: 60,
      margin: 0,
      errorCorrectionLevel: 'M'
    }).then(setQrDataUrl).catch(() => {});
  }, [sn]);

  if (!qrDataUrl) return null;
  return <img src={qrDataUrl} alt="QR" className="w-[45px] h-[45px] my-0.5" />;
}

export function SNLabelPrint({ open, onClose, items }: SNLabelPrintProps) {
  const [selectedSNs, setSelectedSNs] = useState<Set<string>>(new Set(items.map(i => i.sn)));
  const printRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const isLongSNPreview = items[0] && items[0].sn.length > SN_LENGTH_THRESHOLD;

  useEffect(() => {
    if (barcodeRef.current && items[0]?.sn && !isLongSNPreview) {
      try {
        JsBarcode(barcodeRef.current, items[0].sn, {
          format: "CODE128",
          width: 1,
          height: 20,
          displayValue: false,
          margin: 0,
        });
      } catch (e) {
        console.error("Barcode error:", e);
      }
    }
  }, [items, isLongSNPreview]);

  const toggleSelect = (sn: string) => {
    const newSet = new Set(selectedSNs);
    if (newSet.has(sn)) {
      newSet.delete(sn);
    } else {
      newSet.add(sn);
    }
    setSelectedSNs(newSet);
  };

  const selectAll = () => {
    setSelectedSNs(new Set(items.map(i => i.sn)));
  };

  const deselectAll = () => {
    setSelectedSNs(new Set());
  };

  const truncateName = (name: string, maxLength: number = 14) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 2) + "..";
  };

  const isLongSN = (sn: string) => sn.length > SN_LENGTH_THRESHOLD;

  const generateBarcodeSVG = (sn: string): string => {
    const canvas = document.createElement("canvas");
    try {
      JsBarcode(canvas, sn, {
        format: "CODE128",
        width: 1.2,
        height: 22,
        displayValue: false,
        margin: 0,
      });
      return canvas.toDataURL("image/png");
    } catch (e) {
      return "";
    }
  };

  const generateQRCode = async (sn: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(sn, {
        width: 80,
        margin: 0,
        errorCorrectionLevel: 'M'
      });
    } catch (e) {
      return "";
    }
  };

  const handlePrint = async () => {
    const selectedItems = items.filter(i => selectedSNs.has(i.sn));
    if (selectedItems.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Generate all codes (barcode or QR) for selected items
    const labelsHtmlPromises = selectedItems.map(async (item) => {
      const usesQR = isLongSN(item.sn);
      const codeDataUrl = usesQR 
        ? await generateQRCode(item.sn) 
        : generateBarcodeSVG(item.sn);
      
      return `
        <div class="label">
          <div class="product-name">${truncateName(item.productName)}</div>
          ${codeDataUrl ? `<img class="${usesQR ? 'qrcode' : 'barcode'}" src="${codeDataUrl}" alt="${usesQR ? 'QR' : 'barcode'}" />` : ''}
          <div class="sn-code">${item.sn}</div>
          ${item.color ? `<div class="color">สี: ${item.color}</div>` : ''}
        </div>
      `;
    });

    const labelsHtml = (await Promise.all(labelsHtmlPromises)).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print SN Labels</title>
        <style>
          @page {
            size: auto;
            margin: 3mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Kanit', Arial, sans-serif;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 1mm;
          }
          .label {
            width: 38mm;
            height: 25mm;
            border: 0.3px solid #ccc;
            padding: 1.5mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-inside: avoid;
            overflow: hidden;
          }
          .product-name {
            font-size: 6pt;
            font-weight: 500;
            line-height: 1.1;
            margin-bottom: 0.5mm;
            word-break: break-word;
            max-width: 100%;
          }
          .barcode {
            width: 32mm;
            height: 6mm;
            object-fit: contain;
            margin: 0.5mm 0;
          }
          .qrcode {
            width: 12mm;
            height: 12mm;
            object-fit: contain;
            margin: 0.5mm 0;
          }
          .sn-code {
            font-size: 5.5pt;
            font-weight: 600;
            font-family: 'Courier New', monospace;
            letter-spacing: 0.3px;
            word-break: break-all;
            max-width: 100%;
          }
          .color {
            font-size: 5pt;
            color: #666;
            margin-top: 0.5mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .label { border: 0.3px solid #ccc; }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            พิมพ์ป้าย Serial Number (2.5 x 3.8 cm)
          </DialogTitle>
          <DialogDescription>
            เลือก Serial Number ที่ต้องการพิมพ์ป้าย
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              เลือก {selectedSNs.size} จาก {items.length} รายการ
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                เลือกทั้งหมด
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                ไม่เลือก
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-3">
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.sn}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedSNs.has(item.sn)}
                    onCheckedChange={() => toggleSelect(item.sn)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium">{item.sn}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.productName} {item.color && `- ${item.color}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Preview */}
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-2">
              ตัวอย่างป้าย: {items[0] && isLongSN(items[0].sn) ? "(QR Code - SN ยาว)" : "(Barcode)"}
            </div>
            <div 
              ref={printRef}
              className="inline-flex flex-col items-center justify-center border border-border bg-background p-1.5 text-center"
              style={{ width: "144px", height: "95px" }}
            >
              <div className="text-[8px] font-medium leading-tight truncate max-w-full">
                {items[0] ? truncateName(items[0].productName) : "ชื่อสินค้า"}
              </div>
              {items[0] && isLongSN(items[0].sn) ? (
                <QRCodePreview sn={items[0].sn} />
              ) : (
                <svg ref={barcodeRef} className="w-[120px] h-[24px] my-0.5"></svg>
              )}
              <div className="font-mono text-[7px] font-semibold break-all max-w-full leading-tight">
                {items[0]?.sn || "SN00001"}
              </div>
              {items[0]?.color && (
                <div className="text-[6px] text-muted-foreground mt-0.5">
                  สี: {items[0].color}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              ยกเลิก
            </Button>
            <Button 
              onClick={handlePrint} 
              className="flex-1"
              disabled={selectedSNs.size === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              พิมพ์ ({selectedSNs.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
