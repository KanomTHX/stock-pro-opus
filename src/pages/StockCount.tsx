import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus, Eye, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface StockByBranch {
  product_id: string;
  qty: number;
  products: Product;
}

interface CountItem {
  product_id: string;
  product_sku: string;
  product_name: string;
  system_qty: number;
  counted_qty: number;
  note: string;
}

interface StockCountHeader {
  id: string;
  count_no: string;
  branch_id: string;
  counted_by: string;
  counted_at: string;
  status: string;
  note: string | null;
  branches: { name: string; code: string };
}

const StockCount = () => {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [stockItems, setStockItems] = useState<StockByBranch[]>([]);
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<StockCountHeader[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewDetail, setViewDetail] = useState<StockCountHeader | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchStock();
    } else {
      setStockItems([]);
      setCountItems([]);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name");
    if (data) setBranches(data);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("stock_count_headers")
      .select(`*, branches(name, code)`)
      .order("counted_at", { ascending: false })
      .limit(10);
    if (data) setHistory(data as any);
    setHistoryLoading(false);
  };

  const fetchBranchStock = async () => {
    setLoading(true);
    // Fetch serial numbers that are available in this branch
    const { data: snData } = await supabase
      .from("serial_numbers")
      .select(`product_id, sn, products(id, sku, name)`)
      .eq("branch_id", selectedBranch)
      .eq("status", "available");
    
    if (snData && snData.length > 0) {
      // Group by product_id and count SNs
      const productMap = new Map<string, { product: any; count: number }>();
      
      snData.forEach((sn: any) => {
        const existing = productMap.get(sn.product_id);
        if (existing) {
          existing.count += 1;
        } else {
          productMap.set(sn.product_id, {
            product: sn.products,
            count: 1,
          });
        }
      });

      setCountItems(
        Array.from(productMap.entries()).map(([productId, data]) => ({
          product_id: productId,
          product_sku: data.product.sku,
          product_name: data.product.name,
          system_qty: data.count,
          counted_qty: data.count,
          note: "",
        }))
      );
    } else {
      setCountItems([]);
    }
    setLoading(false);
  };

  const updateCountedQty = (productId: string, qty: number) => {
    setCountItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, counted_qty: qty } : item
      )
    );
  };

  const updateItemNote = (productId: string, note: string) => {
    setCountItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, note } : item
      )
    );
  };

  const generateCountNo = () => {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const d = now.getDate().toString().padStart(2, "0");
    const h = now.getHours().toString().padStart(2, "0");
    const min = now.getMinutes().toString().padStart(2, "0");
    return `SC${y}${m}${d}${h}${min}`;
  };

  const handleSubmit = async () => {
    if (!selectedBranch) {
      toast({ title: "กรุณาเลือกสาขา", variant: "destructive" });
      return;
    }
    if (countItems.length === 0) {
      toast({ title: "ไม่มีสินค้าให้ตรวจนับ", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

      const countNo = generateCountNo();
      
      // Create header
      const { data: header, error: headerError } = await supabase
        .from("stock_count_headers")
        .insert({
          count_no: countNo,
          branch_id: selectedBranch,
          counted_by: user.id,
          status: "completed",
          note: note || null,
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // Create items
      const items = countItems.map((item) => ({
        count_id: header.id,
        product_id: item.product_id,
        system_qty: item.system_qty,
        counted_qty: item.counted_qty,
        note: item.note || null,
      }));

      const { error: itemsError } = await supabase
        .from("stock_count_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast({ title: "บันทึกการตรวจนับสำเร็จ", description: `เลขที่: ${countNo}` });
      
      // Reset form
      setSelectedBranch("");
      setCountItems([]);
      setNote("");
      fetchHistory();
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDetailItems = async (countId: string) => {
    setDetailLoading(true);
    const { data } = await supabase
      .from("stock_count_items")
      .select(`*, products(sku, name)`)
      .eq("count_id", countId);
    if (data) setDetailItems(data);
    setDetailLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" />เสร็จสิ้น</Badge>;
      case "draft":
        return <Badge variant="secondary">ร่าง</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />ยกเลิก</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getVarianceBadge = (variance: number) => {
    if (variance === 0) return <Badge variant="outline">ตรง</Badge>;
    if (variance > 0) return <Badge className="bg-emerald-500">+{variance}</Badge>;
    return <Badge variant="destructive">{variance}</Badge>;
  };

  const hasVariance = countItems.some((item) => item.counted_qty !== item.system_qty);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          ตรวจนับสต็อก
        </h1>
        <p className="text-muted-foreground">ตรวจนับสินค้าคงคลังตามสาขา</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Count Form */}
        <Card>
          <CardHeader>
            <CardTitle>สร้างรายการตรวจนับ</CardTitle>
            <CardDescription>เลือกสาขาและกรอกจำนวนที่นับได้</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>สาขา *</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      [{b.code}] {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : countItems.length > 0 ? (
              <>
                <div className="border rounded-md max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>สินค้า</TableHead>
                        <TableHead className="text-center w-20">ระบบ</TableHead>
                        <TableHead className="text-center w-24">นับได้</TableHead>
                        <TableHead className="text-center w-20">ผลต่าง</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {countItems.map((item) => {
                        const variance = item.counted_qty - item.system_qty;
                        return (
                          <TableRow key={item.product_id}>
                            <TableCell>
                              <div className="font-medium text-xs">{item.product_sku}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {item.product_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {item.system_qty}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                value={item.counted_qty}
                                onChange={(e) => updateCountedQty(item.product_id, parseInt(e.target.value) || 0)}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              {getVarianceBadge(variance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {hasVariance && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">พบผลต่างจากการตรวจนับ</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>หมายเหตุ</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                  />
                </div>

                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      บันทึกการตรวจนับ
                    </>
                  )}
                </Button>
              </>
            ) : selectedBranch ? (
              <div className="text-center py-8 text-muted-foreground">
                ไม่มีสินค้าในสาขานี้
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>ประวัติการตรวจนับ</CardTitle>
            <CardDescription>รายการตรวจนับล่าสุด 10 รายการ</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ยังไม่มีประวัติการตรวจนับ
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium">{item.count_no}</div>
                      <div className="text-sm text-muted-foreground">
                        [{item.branches.code}] {item.branches.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(item.counted_at), "dd/MM/yyyy HH:mm", { locale: th })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setViewDetail(item);
                              fetchDetailItems(item.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>รายละเอียดการตรวจนับ {viewDetail?.count_no}</DialogTitle>
                            <DialogDescription>
                              สาขา: [{viewDetail?.branches.code}] {viewDetail?.branches.name}
                              <br />
                              วันที่: {viewDetail && format(new Date(viewDetail.counted_at), "dd/MM/yyyy HH:mm", { locale: th })}
                            </DialogDescription>
                          </DialogHeader>
                          {detailLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>สินค้า</TableHead>
                                  <TableHead className="text-center">ระบบ</TableHead>
                                  <TableHead className="text-center">นับได้</TableHead>
                                  <TableHead className="text-center">ผลต่าง</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {detailItems.map((di) => (
                                  <TableRow key={di.id}>
                                    <TableCell>
                                      <div className="font-medium text-sm">{di.products?.sku}</div>
                                      <div className="text-xs text-muted-foreground">{di.products?.name}</div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono">{di.system_qty}</TableCell>
                                    <TableCell className="text-center font-mono">{di.counted_qty}</TableCell>
                                    <TableCell className="text-center">
                                      {getVarianceBadge(di.variance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                          {viewDetail?.note && (
                            <div className="mt-4 p-3 bg-muted rounded-md">
                              <div className="text-sm font-medium">หมายเหตุ:</div>
                              <div className="text-sm text-muted-foreground">{viewDetail.note}</div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockCount;