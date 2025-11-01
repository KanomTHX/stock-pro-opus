import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2, ShoppingCart, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  totalProducts: number;
  totalBranches: number;
  categories: number;
  brands: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalBranches: 0,
    categories: 0,
    brands: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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