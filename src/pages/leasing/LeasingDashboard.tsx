import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalCustomers: number;
  activeContracts: number;
  totalCreditReleased: number;
  totalCreditLimit: number;
  overdueContracts: number;
}

interface OverdueContract {
  id: string;
  contract_no: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  remaining: number;
  days_overdue: number;
}

interface GradeDistribution {
  grade: string;
  count: number;
  color: string;
}

const GRADE_COLORS = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#eab308",
  F: "#ef4444",
};

const LeasingDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    activeContracts: 0,
    totalCreditReleased: 0,
    totalCreditLimit: 0,
    overdueContracts: 0,
  });
  const [overdueContracts, setOverdueContracts] = useState<OverdueContract[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch customers count and credit data
      const { data: customers, count: customerCount } = await supabase
        .from("customers")
        .select("id, credit_limit, credit_grade", { count: "exact" });

      const totalCreditLimit = (customers || []).reduce(
        (sum, c) => sum + (c.credit_limit || 0),
        0
      );

      // Grade distribution
      const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, F: 0 };
      (customers || []).forEach((c) => {
        if (c.credit_grade && gradeCount[c.credit_grade] !== undefined) {
          gradeCount[c.credit_grade]++;
        }
      });

      setGradeDistribution([
        { grade: "A - ดี", count: gradeCount.A, color: GRADE_COLORS.A },
        { grade: "B - ปกติ", count: gradeCount.B, color: GRADE_COLORS.B },
        { grade: "C - เสี่ยง", count: gradeCount.C, color: GRADE_COLORS.C },
        { grade: "F - Blacklist", count: gradeCount.F, color: GRADE_COLORS.F },
      ]);

      // Fetch active contracts
      const { data: contracts, count: activeCount } = await supabase
        .from("contracts")
        .select("id, contract_no, customer_id, total_amount, monthly_payment, installment_months, start_date, customers(full_name)", { count: "exact" })
        .eq("status", "active");

      // Calculate total credit released (total of all active contract amounts)
      const totalCreditReleased = (contracts || []).reduce(
        (sum, c) => sum + (c.total_amount || 0),
        0
      );

      // Check for overdue contracts
      const overdueList: OverdueContract[] = [];

      for (const contract of contracts || []) {
        // Get payments for this contract
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, paid_at")
          .eq("contract_id", contract.id);

        const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);
        const remaining = contract.total_amount - totalPaid;

        // Calculate expected payments based on start date
        const startDate = new Date(contract.start_date);
        const now = new Date();
        const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                          (now.getMonth() - startDate.getMonth());
        
        const expectedPayments = Math.min(monthsDiff, contract.installment_months);
        const expectedAmount = expectedPayments * contract.monthly_payment;

        // If paid less than expected, it's overdue
        if (totalPaid < expectedAmount && remaining > 0) {
          const shortfall = expectedAmount - totalPaid;
          const daysOverdue = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) - 30);

          overdueList.push({
            id: contract.id,
            contract_no: contract.contract_no,
            customer_name: (contract.customers as any)?.full_name || "",
            total_amount: contract.total_amount,
            paid_amount: totalPaid,
            remaining: remaining,
            days_overdue: daysOverdue,
          });
        }
      }

      setOverdueContracts(overdueList.sort((a, b) => b.days_overdue - a.days_overdue).slice(0, 10));

      setStats({
        totalCustomers: customerCount || 0,
        activeContracts: activeCount || 0,
        totalCreditReleased,
        totalCreditLimit,
        overdueContracts: overdueList.length,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

  const creditUtilization = stats.totalCreditLimit > 0
    ? (stats.totalCreditReleased / stats.totalCreditLimit) * 100
    : 0;

  const statCards = [
    {
      title: "ลูกค้าทั้งหมด",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "สัญญาที่ Active",
      value: stats.activeContracts,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "สินเชื่อที่ปล่อย",
      value: formatCurrency(stats.totalCreditReleased),
      icon: CreditCard,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      isLarge: true,
    },
    {
      title: "สัญญาค้างชำระ",
      value: stats.overdueContracts,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gradient-primary">ระบบเช่าซื้อ</h1>
        <p className="text-muted-foreground">ภาพรวมการปล่อยสินเชื่อและติดตามการชำระ</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            className="shadow-card hover:shadow-elevated transition-all duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={stat.isLarge ? "text-xl font-bold" : "text-3xl font-bold"}>
                {isLoading ? (
                  <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                ) : (
                  stat.value
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Credit Utilization & Grade Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Credit Utilization */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-primary" />
              การใช้วงเงินเครดิต
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">สินเชื่อที่ปล่อย</span>
                <span className="font-medium">{formatCurrency(stats.totalCreditReleased)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">วงเงินเครดิตรวม</span>
                <span className="font-medium">{formatCurrency(stats.totalCreditLimit)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(creditUtilization, 100)}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                ใช้ไปแล้ว {creditUtilization.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              การกระจายเกรดลูกค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">กำลังโหลด...</div>
              </div>
            ) : (
              <ChartContainer
                config={{
                  count: {
                    label: "จำนวนลูกค้า",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[200px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="grade" type="category" width={80} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Contracts */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            สัญญาค้างชำระ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : overdueContracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีสัญญาค้างชำระ 🎉
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขสัญญา</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead className="text-right">ยอดทั้งหมด</TableHead>
                    <TableHead className="text-right">ชำระแล้ว</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                    <TableHead className="text-center">วันที่เกินกำหนด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono">{contract.contract_no}</TableCell>
                      <TableCell>{contract.customer_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(contract.total_amount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(contract.paid_amount)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {formatCurrency(contract.remaining)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">
                          {contract.days_overdue} วัน
                        </Badge>
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

export default LeasingDashboard;
