import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Ban,
  CheckCircle,
  User,
  Package,
  Calculator,
  FileCheck,
} from "lucide-react";

interface Customer {
  id: string;
  full_name: string;
  id_card: string;
  phone: string | null;
  credit_limit: number;
  credit_grade: "A" | "B" | "C" | "F";
  active_debt?: number;
  remaining_credit?: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface SerialNumber {
  id: string;
  sn: string;
  product_id: string;
  status: string;
}

interface Employee {
  id: string;
  name: string;
  sales_commission_pct: number;
}

const CREDIT_GRADE_CONFIG = {
  A: { label: "A - ดี", color: "bg-green-500 text-white", borderColor: "border-green-500" },
  B: { label: "B - ปกติ", color: "bg-blue-500 text-white", borderColor: "border-blue-500" },
  C: { label: "C - เสี่ยง", color: "bg-yellow-500 text-white", borderColor: "border-yellow-500" },
  F: { label: "F - Blacklist", color: "bg-red-500 text-white", borderColor: "border-red-500" },
};

const STEPS = [
  { id: 1, label: "เลือกลูกค้า", icon: User },
  { id: 2, label: "เลือกสินค้า", icon: Package },
  { id: 3, label: "คำนวณเงิน", icon: Calculator },
  { id: 4, label: "ยืนยัน", icon: FileCheck },
];

const NewContract = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSN, setSelectedSN] = useState<SerialNumber | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [financials, setFinancials] = useState({
    productPrice: "",
    downPayment: "",
    interestRate: "",
    installmentMonths: "",
  });

  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  // Calculated values
  const productPrice = parseFloat(financials.productPrice) || 0;
  const downPayment = parseFloat(financials.downPayment) || 0;
  const interestRate = parseFloat(financials.interestRate) || 0;
  const installmentMonths = parseInt(financials.installmentMonths) || 1;

  const principalAmount = productPrice - downPayment;
  const totalInterest = (principalAmount * interestRate * installmentMonths) / 100 / 12;
  const totalAmount = principalAmount + totalInterest;
  const monthlyPayment = totalAmount / installmentMonths;

  const isOverCreditLimit = selectedCustomer && totalAmount > (selectedCustomer.remaining_credit || 0);
  const isBlacklisted = selectedCustomer?.credit_grade === "F";

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch customers
      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      // Calculate active debt for each customer
      const customersWithDebt: Customer[] = [];
      for (const customer of customersData || []) {
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id, total_amount")
          .eq("customer_id", customer.id)
          .eq("status", "active");

        let activeDebt = 0;
        for (const contract of contracts || []) {
          const { data: payments } = await supabase
            .from("payments")
            .select("amount")
            .eq("contract_id", contract.id);

          const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);
          activeDebt += contract.total_amount - totalPaid;
        }

        customersWithDebt.push({
          ...customer,
          active_debt: activeDebt,
          remaining_credit: customer.credit_limit - activeDebt,
        } as Customer);
      }

      setCustomers(customersWithDebt);

      // Fetch products
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("is_active", true)
        .order("name");
      setProducts(productsData || []);

      // Fetch employees
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, name, sales_commission_pct")
        .eq("is_active", true)
        .order("name");
      setEmployees(employeesData || []);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    }
  };

  const fetchSerialNumbers = async (productId: string) => {
    const { data } = await supabase
      .from("serial_numbers")
      .select("id, sn, product_id, status")
      .eq("product_id", productId)
      .eq("status", "available")
      .order("sn");
    setSerialNumbers((data as SerialNumber[]) || []);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product || null);
    setSelectedSN(null);
    if (product) {
      fetchSerialNumbers(product.id);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && isBlacklisted) {
      toast.error("ไม่สามารถสร้างสัญญาให้ลูกค้า Blacklist ได้");
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedCustomer && !isBlacklisted;
      case 2:
        return selectedProduct && selectedSN;
      case 3:
        if (isOverCreditLimit && !overrideReason) {
          return false;
        }
        return productPrice > 0 && downPayment >= 0 && installmentMonths > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const generateContractNo = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `CT${year}${month}${random}`;
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedProduct || !selectedSN) return;

    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const contractNo = generateContractNo();

      // Create contract
      const { error: contractError } = await supabase.from("contracts").insert({
        contract_no: contractNo,
        customer_id: selectedCustomer.id,
        product_id: selectedProduct.id,
        serial_number_id: selectedSN.id,
        salesperson_id: selectedEmployee?.id || null,
        down_payment: downPayment,
        principal_amount: principalAmount,
        interest_rate: interestRate,
        total_interest: totalInterest,
        total_amount: totalAmount,
        installment_months: installmentMonths,
        monthly_payment: monthlyPayment,
        admin_override_reason: isOverCreditLimit ? overrideReason : null,
        created_by: userId,
      });

      if (contractError) throw contractError;

      // Update serial number status to 'leased'
      const { error: snError } = await supabase
        .from("serial_numbers")
        .update({ status: "leased" })
        .eq("id", selectedSN.id);

      if (snError) throw snError;

      // Create sales commission if employee selected
      if (selectedEmployee && selectedEmployee.sales_commission_pct > 0) {
        const commissionAmount = (totalAmount * selectedEmployee.sales_commission_pct) / 100;
        
        // Get the contract ID we just created
        const { data: newContract } = await supabase
          .from("contracts")
          .select("id")
          .eq("contract_no", contractNo)
          .single();

        if (newContract) {
          await supabase.from("commissions").insert({
            employee_id: selectedEmployee.id,
            contract_id: newContract.id,
            commission_type: "sales",
            amount: commissionAmount,
          });
        }
      }

      toast.success(`สร้างสัญญา ${contractNo} สำเร็จ`);
      navigate("/leasing/contracts");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/leasing/contracts")}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          กลับ
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">สร้างสัญญาใหม่</h1>
          <p className="text-muted-foreground">ขั้นตอนที่ {currentStep} จาก 4</p>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.id
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <step.icon className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="w-8 h-0.5 bg-border mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          {/* Step 1: Select Customer */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label>เลือกลูกค้า</Label>
                <Select
                  value={selectedCustomer?.id || ""}
                  onValueChange={(value) => {
                    const customer = customers.find((c) => c.id === value);
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกลูกค้า..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex items-center gap-2">
                          <span>{customer.full_name}</span>
                          <Badge className={CREDIT_GRADE_CONFIG[customer.credit_grade].color}>
                            {customer.credit_grade}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomer && (
                <Card className={`border-2 ${CREDIT_GRADE_CONFIG[selectedCustomer.credit_grade].borderColor}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-muted-foreground" />
                          <span className="font-semibold text-lg">{selectedCustomer.full_name}</span>
                          <Badge className={CREDIT_GRADE_CONFIG[selectedCustomer.credit_grade].color}>
                            {CREDIT_GRADE_CONFIG[selectedCustomer.credit_grade].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          เลขบัตร: {selectedCustomer.id_card} | โทร: {selectedCustomer.phone || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">วงเงินเครดิต</p>
                        <p className="font-semibold">{formatCurrency(selectedCustomer.credit_limit)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">หนี้คงค้าง</p>
                        <p className="font-semibold text-orange-600">
                          {formatCurrency(selectedCustomer.active_debt || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">เครดิตคงเหลือ</p>
                        <p className={`font-semibold ${(selectedCustomer.remaining_credit || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatCurrency(selectedCustomer.remaining_credit || 0)}
                        </p>
                      </div>
                    </div>

                    {isBlacklisted && (
                      <Alert variant="destructive" className="mt-4">
                        <Ban className="w-4 h-4" />
                        <AlertTitle>ลูกค้าอยู่ใน Blacklist</AlertTitle>
                        <AlertDescription>
                          ไม่สามารถสร้างสัญญาให้ลูกค้ารายนี้ได้
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 2: Select Product & S/N */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>เลือกสินค้า</Label>
                <Select
                  value={selectedProduct?.id || ""}
                  onValueChange={handleProductChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสินค้า..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div>
                  <Label>เลือก Serial Number (พร้อมขาย)</Label>
                  {serialNumbers.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      ไม่มี S/N ที่พร้อมขายสำหรับสินค้านี้
                    </p>
                  ) : (
                    <Select
                      value={selectedSN?.id || ""}
                      onValueChange={(value) => {
                        const sn = serialNumbers.find((s) => s.id === value);
                        setSelectedSN(sn || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก S/N..." />
                      </SelectTrigger>
                      <SelectContent>
                        {serialNumbers.map((sn) => (
                          <SelectItem key={sn.id} value={sn.id}>
                            {sn.sn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {selectedProduct && selectedSN && (
                <Card className="border-primary/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-semibold">{selectedProduct.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {selectedProduct.sku} | S/N: {selectedSN.sn}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Financials */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productPrice">ราคาสินค้า (บาท) *</Label>
                  <Input
                    id="productPrice"
                    type="number"
                    value={financials.productPrice}
                    onChange={(e) =>
                      setFinancials({ ...financials, productPrice: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="downPayment">เงินดาวน์ (บาท)</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    value={financials.downPayment}
                    onChange={(e) =>
                      setFinancials({ ...financials, downPayment: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="interestRate">อัตราดอกเบี้ย (% ต่อปี)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    value={financials.interestRate}
                    onChange={(e) =>
                      setFinancials({ ...financials, interestRate: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="installmentMonths">จำนวนงวด (เดือน) *</Label>
                  <Input
                    id="installmentMonths"
                    type="number"
                    value={financials.installmentMonths}
                    onChange={(e) =>
                      setFinancials({ ...financials, installmentMonths: e.target.value })
                    }
                    placeholder="12"
                  />
                </div>
              </div>

              <div>
                <Label>พนักงานขาย (ไม่บังคับ)</Label>
                <Select
                  value={selectedEmployee?.id || ""}
                  onValueChange={(value) => {
                    const emp = employees.find((e) => e.id === value);
                    setSelectedEmployee(emp || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกพนักงานขาย..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} (คอม {emp.sales_commission_pct}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Calculation Summary */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    สรุปการคำนวณ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>ราคาสินค้า:</span>
                      <span>{formatCurrency(productPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>หักเงินดาวน์:</span>
                      <span className="text-red-600">- {formatCurrency(downPayment)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>เงินต้น:</span>
                      <span className="font-medium">{formatCurrency(principalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ดอกเบี้ยรวม ({interestRate}% x {installmentMonths} เดือน):</span>
                      <span>+ {formatCurrency(totalInterest)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-lg font-bold">
                      <span>ยอดผ่อนทั้งหมด:</span>
                      <span className="text-primary">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>ผ่อนต่อเดือน ({installmentMonths} งวด):</span>
                      <span className="text-primary">{formatCurrency(monthlyPayment)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Limit Warning */}
              {selectedCustomer && isOverCreditLimit && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>เกินวงเงินเครดิต!</AlertTitle>
                  <AlertDescription>
                    <p>
                      ยอดผ่อน {formatCurrency(totalAmount)} เกินเครดิตคงเหลือ{" "}
                      {formatCurrency(selectedCustomer.remaining_credit || 0)}
                    </p>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOverrideInput(!showOverrideInput)}
                      >
                        {showOverrideInput ? "ซ่อน" : "ขออนุมัติพิเศษ (Admin)"}
                      </Button>
                      {showOverrideInput && (
                        <div className="mt-2">
                          <Textarea
                            placeholder="ระบุเหตุผลในการขออนุมัติเกินวงเงิน..."
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertTitle className="text-green-700">ตรวจสอบข้อมูลก่อนยืนยัน</AlertTitle>
              </Alert>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      ข้อมูลลูกค้า
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">ชื่อ:</span> {selectedCustomer?.full_name}</p>
                    <p><span className="text-muted-foreground">เลขบัตร:</span> {selectedCustomer?.id_card}</p>
                    <p><span className="text-muted-foreground">เกรด:</span>{" "}
                      <Badge className={CREDIT_GRADE_CONFIG[selectedCustomer?.credit_grade || "B"].color}>
                        {selectedCustomer?.credit_grade}
                      </Badge>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      สินค้า
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">สินค้า:</span> {selectedProduct?.name}</p>
                    <p><span className="text-muted-foreground">SKU:</span> {selectedProduct?.sku}</p>
                    <p><span className="text-muted-foreground">S/N:</span> {selectedSN?.sn}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    สรุปการเงิน
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">เงินดาวน์</p>
                      <p className="font-semibold">{formatCurrency(downPayment)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">เงินต้น</p>
                      <p className="font-semibold">{formatCurrency(principalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ดอกเบี้ย</p>
                      <p className="font-semibold">{interestRate}% / ปี</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">จำนวนงวด</p>
                      <p className="font-semibold">{installmentMonths} เดือน</p>
                    </div>
                    <div className="col-span-2 border-t pt-2">
                      <div className="flex justify-between text-lg">
                        <span className="font-bold">ยอดผ่อนทั้งหมด:</span>
                        <span className="font-bold text-primary">{formatCurrency(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>ผ่อนเดือนละ:</span>
                        <span className="font-semibold">{formatCurrency(monthlyPayment)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedEmployee && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm">
                      <span className="text-muted-foreground">พนักงานขาย:</span>{" "}
                      {selectedEmployee.name} (ค่าคอม {selectedEmployee.sales_commission_pct}% ={" "}
                      {formatCurrency((totalAmount * selectedEmployee.sales_commission_pct) / 100)})
                    </p>
                  </CardContent>
                </Card>
              )}

              {isOverCreditLimit && overrideReason && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>อนุมัติพิเศษ (เกินวงเงิน)</AlertTitle>
                  <AlertDescription>เหตุผล: {overrideReason}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          ย้อนกลับ
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            ถัดไป
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading || !canProceed()}>
            {isLoading ? "กำลังบันทึก..." : "ยืนยันสร้างสัญญา"}
            <CheckCircle className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default NewContract;
