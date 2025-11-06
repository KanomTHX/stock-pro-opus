import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, PackageSearch, TrendingDown, TrendingUp, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface MovementLog {
  id: string;
  product_id: string;
  from_branch_id: string | null;
  to_branch_id: string | null;
  qty: number;
  action: "receive" | "issue" | "transfer_out" | "transfer_in" | "adjustment";
  actor_id: string;
  created_at: string;
  ref_table: string | null;
  ref_id: string | null;
  note: string | null;
  products: {
    sku: string;
    name: string;
    unit: string;
  };
  from_branch: {
    name: string;
    code: string;
  } | null;
  to_branch: {
    name: string;
    code: string;
  } | null;
}

const MovementLogs = () => {
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch products
      const { data: productsData } = await supabase
        .from("products")
        .select("id, sku, name")
        .eq("is_active", true)
        .order("name");
      setProducts(productsData || []);

      // Fetch branches
      const { data: branchesData } = await supabase
        .from("branches")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      setBranches(branchesData || []);

      // Fetch movement logs
      await fetchLogs();
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from("movement_logs")
        .select(
          `
          *,
          products (sku, name, unit),
          from_branch:branches!movement_logs_from_branch_id_fkey (name, code),
          to_branch:branches!movement_logs_to_branch_id_fkey (name, code)
        `
        )
        .order("created_at", { ascending: false });

      // Apply filters
      if (selectedProduct !== "all") {
        query = query.eq("product_id", selectedProduct);
      }

      if (selectedBranch !== "all") {
        query = query.or(`from_branch_id.eq.${selectedBranch},to_branch_id.eq.${selectedBranch}`);
      }

      if (selectedAction !== "all") {
        query = query.eq("action", selectedAction as MovementLog["action"]);
      }

      if (startDate) {
        query = query.gte("created_at", new Date(startDate).toISOString());
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDateTime.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by search query
      let filteredData = data || [];
      if (searchQuery) {
        filteredData = filteredData.filter((log: any) =>
          log.products?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.products?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.from_branch?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.to_branch?.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setLogs(filteredData);
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดประวัติการเคลื่อนไหวได้");
      console.error("Error fetching logs:", error);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      fetchLogs();
    }
  }, [selectedProduct, selectedBranch, selectedAction, startDate, endDate, searchQuery]);

  const getActionBadge = (action: MovementLog["action"]) => {
    const actionConfig: Record<MovementLog["action"], { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      receive: { label: "รับเข้า", variant: "default", icon: TrendingUp },
      issue: { label: "เบิกออก", variant: "destructive", icon: TrendingDown },
      transfer_out: { label: "โอนออก", variant: "secondary", icon: ArrowRightLeft },
      transfer_in: { label: "โอนเข้า", variant: "outline", icon: ArrowRightLeft },
      adjustment: { label: "ปรับปรุง", variant: "secondary", icon: PackageSearch },
    };

    const config = actionConfig[action];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient-primary">
          ประวัติการเคลื่อนไหวสินค้า
        </h1>
        <p className="text-muted-foreground mt-1">
          ติดตามและตรวจสอบการเคลื่อนไหวสินค้าในระบบ
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">ตัวกรอง</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">ค้นหา</Label>
              <Input
                id="search"
                placeholder="ค้นหาสินค้า, สาขา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">สินค้า</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="ทุกสินค้า" />
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

            <div className="space-y-2">
              <Label htmlFor="branch">สาขา</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="ทุกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสาขา</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">ประเภทการเคลื่อนไหว</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="ทุกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  <SelectItem value="receive">รับเข้า</SelectItem>
                  <SelectItem value="issue">เบิกออก</SelectItem>
                  <SelectItem value="transfer_out">โอนออก</SelectItem>
                  <SelectItem value="transfer_in">โอนเข้า</SelectItem>
                  <SelectItem value="adjustment">ปรับปรุง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">วันที่เริ่มต้น</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">วันที่สิ้นสุด</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>ผลลัพธ์ ({logs.length} รายการ)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลดข้อมูล...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <PackageSearch className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">ไม่พบข้อมูล</h3>
              <p className="text-muted-foreground">
                ลองปรับเปลี่ยนตัวกรองเพื่อค้นหาข้อมูล
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่/เวลา</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>จาก</TableHead>
                    <TableHead>ถึง</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: th })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.products.name}</div>
                          <div className="text-xs text-muted-foreground">
                            SKU: {log.products.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {log.qty} {log.products.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.from_branch ? (
                          <div>
                            <div>{log.from_branch.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ({log.from_branch.code})
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.to_branch ? (
                          <div>
                            <div>{log.to_branch.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ({log.to_branch.code})
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.note ? (
                          <span className="text-sm">{log.note}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MovementLogs;
