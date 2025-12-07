import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Receipt, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Contract {
  id: string;
  contract_no: string;
  customer_id: string;
  total_amount: number;
  monthly_payment: number;
  installment_months: number;
  customers: { full_name: string } | null;
}

interface Employee {
  id: string;
  name: string;
  collection_commission_pct: number;
}

interface Payment {
  id: string;
  contract_id: string;
  payment_no: number;
  amount: number;
  paid_at: string;
  collector_id: string | null;
  note: string | null;
  contracts: { contract_no: string; customers: { full_name: string } | null } | null;
  employees: { name: string } | null;
}

const Payments = () => {
  const [searchParams] = useSearchParams();
  const contractIdParam = searchParams.get("contract");

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    contract_id: contractIdParam || "",
    amount: "",
    collector_id: "",
    note: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (contractIdParam) {
      setFormData((prev) => ({ ...prev, contract_id: contractIdParam }));
    }
  }, [contractIdParam]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch active contracts
      const { data: contractsData } = await supabase
        .from("contracts")
        .select(`
          id,
          contract_no,
          customer_id,
          total_amount,
          monthly_payment,
          installment_months,
          customers(full_name)
        `)
        .eq("status", "active")
        .order("contract_no");

      setContracts((contractsData as Contract[]) || []);

      // Fetch employees
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, name, collection_commission_pct")
        .eq("is_active", true)
        .order("name");

      setEmployees((employeesData as Employee[]) || []);

      // Fetch recent payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select(`
          *,
          contracts(contract_no, customers(full_name)),
          employees(name)
        `)
        .order("paid_at", { ascending: false })
        .limit(50);

      setPayments((paymentsData as Payment[]) || []);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  };

  const getNextPaymentNo = async (contractId: string): Promise<number> => {
    const { data } = await supabase
      .from("payments")
      .select("payment_no")
      .eq("contract_id", contractId)
      .order("payment_no", { ascending: false })
      .limit(1);

    return data && data.length > 0 ? data[0].payment_no + 1 : 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contract_id || !formData.amount) {
      toast.error("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    try {
      const paymentNo = await getNextPaymentNo(formData.contract_id);
      const amount = parseFloat(formData.amount);

      // Create payment
      const { data: newPayment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          contract_id: formData.contract_id,
          payment_no: paymentNo,
          amount: amount,
          collector_id: formData.collector_id || null,
          note: formData.note || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create collection commission if collector selected
      if (formData.collector_id) {
        const collector = employees.find((e) => e.id === formData.collector_id);
        if (collector && collector.collection_commission_pct > 0) {
          const commissionAmount = (amount * collector.collection_commission_pct) / 100;

          await supabase.from("commissions").insert({
            employee_id: collector.id,
            contract_id: formData.contract_id,
            payment_id: newPayment.id,
            commission_type: "collection",
            amount: commissionAmount,
          });
        }
      }

      // Check if contract should be marked as completed
      const contract = contracts.find((c) => c.id === formData.contract_id);
      if (contract) {
        const { data: allPayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("contract_id", formData.contract_id);

        const totalPaid = (allPayments || []).reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid >= contract.total_amount) {
          await supabase
            .from("contracts")
            .update({ status: "completed" })
            .eq("id", formData.contract_id);

          toast.success("ปิดสัญญาเรียบร้อย - ชำระครบแล้ว");
        }
      }

      toast.success(`บันทึกการชำระงวดที่ ${paymentNo} สำเร็จ`);
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "เกิดข้อผิดพลาด");
    }
  };

  const resetForm = () => {
    setFormData({
      contract_id: contractIdParam || "",
      amount: "",
      collector_id: "",
      note: "",
    });
  };

  const handleContractChange = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    setFormData({
      ...formData,
      contract_id: contractId,
      amount: contract?.monthly_payment.toString() || "",
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: th });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">การชำระเงิน</h1>
          <p className="text-muted-foreground">บันทึกการรับชำระค่างวด</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              บันทึกการชำระ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                บันทึกการชำระค่างวด
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>เลือกสัญญา *</Label>
                <Select
                  value={formData.contract_id}
                  onValueChange={handleContractChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสัญญา..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.contract_no} - {contract.customers?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.contract_id && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-sm">
                    {(() => {
                      const contract = contracts.find(
                        (c) => c.id === formData.contract_id
                      );
                      return contract ? (
                        <div className="space-y-1">
                          <p>
                            <span className="text-muted-foreground">ลูกค้า:</span>{" "}
                            {contract.customers?.full_name}
                          </p>
                          <p>
                            <span className="text-muted-foreground">ยอดทั้งหมด:</span>{" "}
                            {formatCurrency(contract.total_amount)}
                          </p>
                          <p>
                            <span className="text-muted-foreground">งวดละ:</span>{" "}
                            {formatCurrency(contract.monthly_payment)}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="amount">จำนวนเงิน (บาท) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <Label>ผู้เก็บเงิน</Label>
                <Select
                  value={formData.collector_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, collector_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้เก็บเงิน..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} (คอม {emp.collection_commission_pct}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="note">หมายเหตุ</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            รายการชำระล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ยังไม่มีรายการชำระ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขสัญญา</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>งวดที่</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                    <TableHead>วันที่ชำระ</TableHead>
                    <TableHead>ผู้เก็บเงิน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">
                        {payment.contracts?.contract_no}
                      </TableCell>
                      <TableCell>
                        {payment.contracts?.customers?.full_name}
                      </TableCell>
                      <TableCell>{payment.payment_no}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{formatDate(payment.paid_at)}</TableCell>
                      <TableCell>{payment.employees?.name || "-"}</TableCell>
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

export default Payments;
