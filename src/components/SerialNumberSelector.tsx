import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SerialNumber {
  id: string;
  sn: string;
  product_id: string;
  branch_id: string;
  status: string;
}

interface SerialNumberSelectorProps {
  productId: string;
  branchId: string;
  requiredQty: number;
  selectedSNs: string[];
  onSNsChange: (sns: string[]) => void;
}

export default function SerialNumberSelector({
  productId,
  branchId,
  requiredQty,
  selectedSNs,
  onSNsChange,
}: SerialNumberSelectorProps) {
  const [availableSNs, setAvailableSNs] = useState<SerialNumber[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productId && branchId && isExpanded) {
      fetchAvailableSNs();
    }
  }, [productId, branchId, isExpanded]);

  const fetchAvailableSNs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("serial_numbers")
        .select("*")
        .eq("product_id", productId)
        .eq("branch_id", branchId)
        .eq("status", "available")
        .order("sn");

      if (error) throw error;
      setAvailableSNs(data || []);
    } catch (error) {
      console.error("Error fetching serial numbers:", error);
      toast.error("ไม่สามารถโหลด SN ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSNToggle = (sn: string) => {
    if (selectedSNs.includes(sn)) {
      onSNsChange(selectedSNs.filter((s) => s !== sn));
    } else {
      if (selectedSNs.length < requiredQty) {
        onSNsChange([...selectedSNs, sn]);
      } else {
        toast.error(`สามารถเลือกได้สูงสุด ${requiredQty} SN`);
      }
    }
  };

  const isValid = selectedSNs.length === requiredQty;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            Serial Numbers {isValid ? "✓" : `(${selectedSNs.length}/${requiredQty})`}
          </Label>
          {!isValid && (
            <Badge variant="destructive" className="text-xs">
              ต้องเลือก {requiredQty} SN
            </Badge>
          )}
          {isValid && (
            <Badge variant="default" className="text-xs">
              ครบถ้วน
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {selectedSNs.length > 0 && !isExpanded && (
        <div className="text-xs text-muted-foreground">
          เลือกแล้ว: {selectedSNs.join(", ")}
        </div>
      )}

      {isExpanded && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              กำลังโหลด...
            </div>
          ) : availableSNs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              ไม่มี SN ที่พร้อมใช้งาน
            </div>
          ) : (
            <ScrollArea className="h-[200px] w-full rounded border p-2">
              <div className="space-y-2">
                {availableSNs.map((snRecord) => (
                  <div
                    key={snRecord.id}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                  >
                    <Checkbox
                      id={snRecord.id}
                      checked={selectedSNs.includes(snRecord.sn)}
                      onCheckedChange={() => handleSNToggle(snRecord.sn)}
                    />
                    <label
                      htmlFor={snRecord.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {snRecord.sn}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
