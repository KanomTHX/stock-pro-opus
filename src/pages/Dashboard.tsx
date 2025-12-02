import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2, ShoppingCart, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface Stats {
  totalProducts: number;
  totalBranches: number;
  categories: number;
  brands: number;
}

interface TopProduct {
  product_name: string;
  sku: string;
  total_qty: number;
}

interface SlowMovingProduct {
  product_name: string;
  sku: string;
  stock_qty: number;
  days_since_movement: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalBranches: 0,
    categories: 0,
    brands: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [slowMovingProducts, setSlowMovingProducts] = useState<SlowMovingProduct[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);

      const [productsResult, branchesResult, categoriesResult, brandsResult] =
        await Promise.all([
          supabase.from("products").select("id", { count: "exact" }),
          supabase.from("branches").select("id", { count: "exact" }),
          supabase.from("categories").select("id", { count: "exact" }),
          supabase.from("brands").select("id", { count: "exact" }),
        ]);

      setStats({
        totalProducts: productsResult.count || 0,
        totalBranches: branchesResult.count || 0,
        categories: categoriesResult.count || 0,
        brands: brandsResult.count || 0,
      });
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      setChartsLoading(true);

      // Fetch top selling products (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: movementData, error: movementError } = await supabase
        .from("movement_logs")
        .select("product_id, qty, products(name, sku)")
        .in("action", ["issue", "transfer_out"])
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (movementError) throw movementError;

      // Aggregate by product
      const productMap = new Map<string, { name: string; sku: string; total: number }>();
      movementData?.forEach((item: any) => {
        if (item.products) {
          const key = item.product_id;
          const existing = productMap.get(key);
          if (existing) {
            existing.total += item.qty;
          } else {
            productMap.set(key, {
              name: item.products.name,
              sku: item.products.sku,
              total: item.qty,
            });
          }
        }
      });

      const topProductsArray = Array.from(productMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map((p) => ({
          product_name: p.name,
          sku: p.sku,
          total_qty: p.total,
        }));

      setTopProducts(topProductsArray);

      // Fetch slow-moving products (products with stock but no movement in 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: stockData, error: stockError } = await supabase
        .from("stock_by_branch")
        .select("product_id, qty, products(name, sku)")
        .gt("qty", 0);

      if (stockError) throw stockError;

      // For each product with stock, check last movement
      const slowMovingArray: SlowMovingProduct[] = [];
      
      for (const stock of stockData || []) {
        const { data: lastMovement } = await supabase
          .from("movement_logs")
          .select("created_at")
          .eq("product_id", stock.product_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const lastDate = lastMovement?.created_at
          ? new Date(lastMovement.created_at)
          : new Date(0);
        const daysSince = Math.floor(
          (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSince > 60 && stock.products) {
          slowMovingArray.push({
            product_name: stock.products.name,
            sku: stock.products.sku,
            stock_qty: stock.qty,
            days_since_movement: daysSince,
          });
        }
      }

      const uniqueSlowMoving = Array.from(
        new Map(
          slowMovingArray.map((item) => [item.sku, item])
        ).values()
      )
        .sort((a, b) => b.days_since_movement - a.days_since_movement)
        .slice(0, 10);

      setSlowMovingProducts(uniqueSlowMoving);
    } catch (error: any) {
      console.error("Error fetching chart data:", error);
      toast.error("ไม่สามารถโหลดข้อมูลกราฟได้");
    } finally {
      setChartsLoading(false);
    }
  };

  const statCards = [
    {
      title: "จำนวนสินค้า",
      value: stats.totalProducts,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "สาขาทั้งหมด",
      value: stats.totalBranches,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "หมวดหมู่",
      value: stats.categories,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "แบรนด์",
      value: stats.brands,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gradient-primary">
          แดชบอร์ด
        </h1>
        <p className="text-muted-foreground">
          ภาพรวมระบบจัดการสต็อกเฟอร์นิเจอร์
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            className="shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
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
              <div className="text-3xl font-bold">
                {isLoading ? (
                  <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                ) : (
                  stat.value.toLocaleString()
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Selling Products Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              สินค้าขายดี (30 วันล่าสุด)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">กำลังโหลด...</div>
              </div>
            ) : topProducts.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูลการขาย
              </div>
            ) : (
              <ChartContainer
                config={{
                  total_qty: {
                    label: "จำนวนที่ขาย",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} margin={{ left: 0, right: 0, top: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="sku"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      className="text-xs"
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_qty" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Slow Moving Products Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="w-5 h-5 text-orange-600" />
              สินค้าค้างนาน (ไม่มีการเคลื่อนไหว 60+ วัน)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">กำลังโหลด...</div>
              </div>
            ) : slowMovingProducts.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีสินค้าค้างนาน
              </div>
            ) : (
              <ChartContainer
                config={{
                  days_since_movement: {
                    label: "จำนวนวันที่ไม่มีการเคลื่อนไหว",
                    color: "hsl(var(--destructive))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={slowMovingProducts} margin={{ left: 0, right: 0, top: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="sku"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      className="text-xs"
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="days_since_movement" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Welcome Card */}
      <Card className="shadow-card bg-gradient-hero text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-2xl">ยินดีต้อนรับสู่ Furniture Stock Pro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-primary-foreground/90">
            ระบบจัดการสต็อกเฟอร์นิเจอร์แบบครบวงจร สำหรับธุรกิจหลายสาขา
            พร้อมคุณสมบัติครบครัน
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>✓ จัดการสินค้าและสต็อกแบบ Real-time</li>
            <li>✓ รองรับหลายสาขาพร้อมการโอนย้ายสินค้า</li>
            <li>✓ ติดตาม Serial Number (SN) ระดับรายการ</li>
            <li>✓ รายงานและแดชบอร์ดครบครัน</li>
            <li>✓ ระบบสิทธิ์ตามบทบาท (RBAC)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;