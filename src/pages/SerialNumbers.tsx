import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, QrCode, History, Edit, Filter } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface SerialNumber {
  id: string;
  sn: string;
  product_id: string;
  branch_id: string | null;
  status: string;
  received_date: string | null;
  issued_date: string | null;
  created_at: string;
  product?: { name: string; sku: string };
  branch?: { name: string; code: string };
}

interface MovementLog {
  id: string;
  action: string;
  qty: number;
  created_at: string;
  note: string | null;
  from_branch?: { name: string } | null;
  to_branch?: { name: string } | null;
  product?: { name: string };
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

const statusColors: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  transferred: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  issued: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const statusLabels: Record<string, string> = {
  available: "พร้อมใช้งาน",
  transferred: "กำลังโอน",
  issued: "เบิกออกแล้ว",
};

export default function SerialNumbers() {
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSN, setEditingSN] = useState<SerialNumber | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editBranch, setEditBranch] = useState("");
  
  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedSN, setSelectedSN] = useState<SerialNumber | null>(null);
  const [movementHistory, setMovementHistory] = useState<MovementLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [snResult, branchResult, productResult] = await Promise.all([
        supabase
          .from("serial_numbers")
          .select(`
            *,
            product:products(name, sku),
            branch:branches(name, code)
          `)
          .order("created_at", { ascending: false }),
        supabase.from("branches").select("id, name, code").eq("is_active", true),
        supabase.from("products").select("id, name, sku").eq("is_active", true),
      ]);

      if (snResult.error) throw snResult.error;
      if (branchResult.error) throw branchResult.error;
      if (productResult.error) throw productResult.error;

      setSerialNumbers(snResult.data || []);
      setBranches(branchResult.data || []);
      setProducts(productResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSerialNumbers = serialNumbers.filter((sn) => {
    const matchesSearch =
      sn.sn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sn.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sn.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || sn.status === filterStatus;
    const matchesBranch = filterBranch === "all" || sn.branch_id === filterBranch;
    const matchesProduct = filterProduct === "all" || sn.product_id === filterProduct;
    return matchesSearch && matchesStatus && matchesBranch && matchesProduct;
  });

  const handleEditClick = (sn: SerialNumber) => {
    setEditingSN(sn);
    setEditStatus(sn.status);
    setEditBranch(sn.branch_id || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSN) return;
    
    try {
      const { error } = await supabase
        .from("serial_numbers")
        .update({
          status: editStatus,
          branch_id: editBranch || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSN.id);

      if (error) throw error;
      
      toast.success("อัปเดต SN สำเร็จ");
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating SN:", error);
      toast.error("ไม่สามารถอัปเดต SN ได้");
    }
  };

  const handleHistoryClick = async (sn: SerialNumber) => {
    setSelectedSN(sn);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    
    try {
      // Fetch movement logs related to this product
      const { data, error } = await supabase
        .from("movement_logs")
        .select(`
          *,
          from_branch:branches!movement_logs_from_branch_id_fkey(name),
          to_branch:branches!movement_logs_to_branch_id_fkey(name),
          product:products(name)
        `)
        .eq("product_id", sn.product_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovementHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("ไม่สามารถโหลดประวัติได้");
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: th });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      receive: "รับเข้า",
      issue: "เบิกออก",
      transfer_out: "โอนออก",
      transfer_in: "โอนเข้า",
      adjustment: "ปรับปรุง",
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient-primary flex items-center gap-2">
            <QrCode className="w-7 h-7" />
            จัดการ Serial Numbers
          </h1>
          <p className="text-muted-foreground mt-1">
            ค้นหา, ดู และแก้ไขสถานะ Serial Numbers
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          ทั้งหมด {serialNumbers.length} รายการ
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา SN, ชื่อสินค้า, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="available">พร้อมใช้งาน</SelectItem>
                <SelectItem value="transferred">กำลังโอน</SelectItem>
                <SelectItem value="issued">เบิกออกแล้ว</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger>
                <SelectValue placeholder="สาขา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสาขา</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger>
                <SelectValue placeholder="สินค้า" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสินค้า</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            รายการ Serial Numbers ({filteredSerialNumbers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredSerialNumbers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <QrCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>ไม่พบ Serial Numbers</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>สาขา</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่รับ</TableHead>
                    <TableHead>วันที่เบิก</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSerialNumbers.map((sn) => (
                    <TableRow key={sn.id}>
                      <TableCell className="font-mono font-medium">
                        {sn.sn}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sn.product?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {sn.product?.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sn.branch ? (
                          <Badge variant="outline">{sn.branch.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[sn.status] || ""}
                        >
                          {statusLabels[sn.status] || sn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(sn.received_date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(sn.issued_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleHistoryClick(sn)}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(sn)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไข Serial Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Serial Number</label>
              <Input value={editingSN?.sn || ""} disabled className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">สินค้า</label>
              <Input
                value={`${editingSN?.product?.sku} - ${editingSN?.product?.name}`}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">สถานะ</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">พร้อมใช้งาน</SelectItem>
                  <SelectItem value="transferred">กำลังโอน</SelectItem>
                  <SelectItem value="issued">เบิกออกแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">สาขา</label>
              <Select value={editBranch || "_none"} onValueChange={(val) => setEditBranch(val === "_none" ? "" : val)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="เลือกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">ไม่ระบุ</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveEdit}>บันทึก</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              ประวัติการเคลื่อนไหว - {selectedSN?.sn}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : movementHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>ไม่พบประวัติการเคลื่อนไหว</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {movementHistory.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">
                        {getActionLabel(log.action)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">จำนวน:</span>{" "}
                        {log.qty}
                      </div>
                      {log.from_branch && (
                        <div>
                          <span className="text-muted-foreground">จากสาขา:</span>{" "}
                          {log.from_branch.name}
                        </div>
                      )}
                      {log.to_branch && (
                        <div>
                          <span className="text-muted-foreground">ไปสาขา:</span>{" "}
                          {log.to_branch.name}
                        </div>
                      )}
                      {log.note && (
                        <div>
                          <span className="text-muted-foreground">หมายเหตุ:</span>{" "}
                          {log.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
