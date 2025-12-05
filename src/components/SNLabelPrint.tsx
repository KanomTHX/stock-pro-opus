import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X } from "lucide-react";
import { useState } from "react";

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

export function SNLabelPrint({ open, onClose, items }: SNLabelPrintProps) {
  const [selectedSNs, setSelectedSNs] = useState<Set<string>>(new Set(items.map(i => i.sn)));
  const printRef = useRef<HTMLDivElement>(null);

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

  const truncateName = (name: string, maxLength: number = 18) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 2) + "..";
  };

  const handlePrint = () => {
    const selectedItems = items.filter(i => selectedSNs.has(i.sn));
    if (selectedItems.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const labelsHtml = selectedItems.map(item => `
      <div class="label">
        <div class="product-name">${truncateName(item.productName)}</div>
        <div class="sn-code">${item.sn}</div>
        ${item.color ? `<div class="color">สี: ${item.color}</div>` : ''}
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print SN Labels</title>
        <style>
          @page {
            size: auto;
            margin: 5mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Kanit', sans-serif;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 2mm;
          }
          .label {
            width: 38mm;
            height: 25mm;
            border: 0.5px solid #ccc;
            padding: 2mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-inside: avoid;
          }
          .product-name {
            font-size: 7pt;
            font-weight: 500;
            line-height: 1.2;
            margin-bottom: 1mm;
            word-break: break-word;
          }
          .sn-code {
            font-size: 9pt;
            font-weight: 700;
            font-family: monospace;
            letter-spacing: 0.5px;
          }
          .color {
            font-size: 6pt;
            color: #666;
            margin-top: 1mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .label { border: 0.5px solid #ccc; }
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
        </script>
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
            <div className="text-xs text-muted-foreground mb-2">ตัวอย่างป้าย:</div>
            <div 
              ref={printRef}
              className="inline-block border border-border bg-background p-2 text-center"
              style={{ width: "95px", height: "62.5px" }}
            >
              <div className="text-[7px] font-medium leading-tight truncate">
                {items[0] ? truncateName(items[0].productName) : "ชื่อสินค้า"}
              </div>
              <div className="font-mono text-[9px] font-bold mt-0.5">
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
