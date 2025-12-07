import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Eye, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Contract {
  id: string;
  contract_no: string;
  customer_id: string;
  product_id: string;
  serial_number_id: string;
  salesperson_id: string | null;
  down_payment: number;
  principal_amount: number;
  interest_rate: number;
  total_interest: number;
  total_amount: number;
  installment_months: number;
  monthly_payment: number;
  start_date: string;
  status: "active" | "completed" | "defaulted" | "cancelled";
  created_at: string;
  customers: { full_name: string; credit_grade: string } | null;
  products: { name: string; sku: string } | null;
  serial_numbers: { sn: string } | null;
  employees: { name: string } | null;
}

interface Payment {
  id: string;
  payment_no: number;
  amount: number;
  paid_at: string;
  collector_id: string | null;
  employees: { name: string } | null;
}

const STATUS_CONFIG = {
  active: { label: "กำลังผ่อน", color: "bg-blue-500 text-white" },
  completed: { label: "ปิดสัญญาแล้ว", color: "bg-green-500 text-white" },
  defaulted: { label: "ค้างชำระ", color: "bg-red-500 text-white" },
  cancelled: { label: "ยกเลิก", color: "bg-gray-500 text-white" },
};

const GRADE_CONFIG = {
  A: { color: "bg-green-500 text-white" },
  B: { color: "bg-blue-500 text-white" },
  C: { color: "bg-yellow-500 text-white" },
  F: { color: "bg-red-500 text-white" },
};

const Contracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          customers(full_name, credit_grade),
          products(name, sku),
          serial_numbers(sn),
          employees(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContracts((data as Contract[]) || []);
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลสัญญาได้");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailOpen(true);

    // Fetch payments for this contract
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        employees(name)
      `)
      .eq("contract_id", contract.id)
      .order("payment_no");

    if (!error && data) {
      setPayments(data as Payment[]);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: th });
    } catch {
      return dateStr;
    }
  };

  const getTotalPaid = () => payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">สัญญาเช่าซื้อ</h1>
          <p className="text-muted-foreground">จัดการสัญญาและติดตามการผ่อนชำระ</p>
        </div>
        <Link to="/leasing/contracts/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            สร้างสัญญาใหม่
          </Button>
        </Link>
      </div>

      <Card className="shadow-card">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีสัญญาเช่าซื้อ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขสัญญา</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead className="text-right">งวดละ</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {contract.contract_no}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contract.customers?.full_name}
                          <Badge
                            className={
                              GRADE_CONFIG[contract.customers?.credit_grade as keyof typeof GRADE_CONFIG]?.color ||
                              "bg-gray-500"
                            }
                            variant="secondary"
                          >
                            {contract.customers?.credit_grade}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{contract.products?.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {contract.products?.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {contract.serial_numbers?.sn}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(contract.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(contract.monthly_payment)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={STATUS_CONFIG[contract.status].color}>
                          {STATUS_CONFIG[contract.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(contract)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              สัญญา {selectedContract?.contract_no}
            </DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-6">
              {/* Contract Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ลูกค้า:</span>
                  <p className="font-medium">{selectedContract.customers?.full_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">สินค้า:</span>
                  <p className="font-medium">{selectedContract.products?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">S/N:</span>
                  <p className="font-mono">{selectedContract.serial_numbers?.sn}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">พนักงานขาย:</span>
                  <p>{selectedContract.employees?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">วันเริ่มสัญญา:</span>
                  <p>{formatDate(selectedContract.start_date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">จำนวนงวด:</span>
                  <p>{selectedContract.installment_months} งวด</p>
                </div>
              </div>

              {/* Financial Info */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">เงินดาวน์:</span>
                      <p className="font-medium">{formatCurrency(selectedContract.down_payment)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">เงินต้น:</span>
                      <p className="font-medium">{formatCurrency(selectedContract.principal_amount)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">อัตราดอกเบี้ย:</span>
                      <p>{selectedContract.interest_rate}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ดอกเบี้ยรวม:</span>
                      <p>{formatCurrency(selectedContract.total_interest)}</p>
                    </div>
                    <div className="col-span-2 border-t pt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ยอดผ่อนทั้งหมด:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(selectedContract.total_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">ชำระแล้ว:</span>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(getTotalPaid())}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">คงเหลือ:</span>
                        <span className="text-orange-600 font-medium">
                          {formatCurrency(selectedContract.total_amount - getTotalPaid())}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <div>
                <h4 className="font-semibold mb-2">ประวัติการชำระ ({payments.length} งวด)</h4>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">ยังไม่มีการชำระ</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>งวดที่</TableHead>
                          <TableHead>วันที่ชำระ</TableHead>
                          <TableHead className="text-right">จำนวนเงิน</TableHead>
                          <TableHead>ผู้เก็บเงิน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{payment.payment_no}</TableCell>
                            <TableCell>{formatDate(payment.paid_at)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>{payment.employees?.name || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Link to={`/leasing/payments?contract=${selectedContract.id}`}>
                  <Button>บันทึกการชำระ</Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contracts;
