import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Edit, User, CreditCard } from "lucide-react";

interface Customer {
  id: string;
  full_name: string;
  id_card: string;
  phone: string | null;
  address: string | null;
  occupation: string | null;
  salary: number;
  credit_limit: number;
  credit_grade: "A" | "B" | "C" | "F";
  is_active: boolean;
  created_at: string;
}

const CREDIT_GRADE_CONFIG = {
  A: { label: "A - ดี", color: "bg-green-500 text-white", textColor: "text-green-600" },
  B: { label: "B - ปกติ", color: "bg-blue-500 text-white", textColor: "text-blue-600" },
  C: { label: "C - เสี่ยง", color: "bg-yellow-500 text-white", textColor: "text-yellow-600" },
  F: { label: "F - Blacklist", color: "bg-red-500 text-white", textColor: "text-red-600" },
};

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    id_card: "",
    phone: "",
    address: "",
    occupation: "",
    salary: "",
    credit_limit: "",
    credit_grade: "B" as "A" | "B" | "C" | "F",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers((data as Customer[]) || []);
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลลูกค้าได้");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const customerData = {
        full_name: formData.full_name,
        id_card: formData.id_card,
        phone: formData.phone || null,
        address: formData.address || null,
        occupation: formData.occupation || null,
        salary: parseFloat(formData.salary) || 0,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        credit_grade: formData.credit_grade,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingCustomer.id);
        if (error) throw error;
        toast.success("อัปเดตข้อมูลลูกค้าสำเร็จ");
      } else {
        const { error } = await supabase.from("customers").insert(customerData);
        if (error) throw error;
        toast.success("เพิ่มลูกค้าสำเร็จ");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      id_card: "",
      phone: "",
      address: "",
      occupation: "",
      salary: "",
      credit_limit: "",
      credit_grade: "B",
    });
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.full_name,
      id_card: customer.id_card,
      phone: customer.phone || "",
      address: customer.address || "",
      occupation: customer.occupation || "",
      salary: customer.salary.toString(),
      credit_limit: customer.credit_limit.toString(),
      credit_grade: customer.credit_grade,
    });
    setIsDialogOpen(true);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id_card.includes(searchTerm) ||
      c.phone?.includes(searchTerm)
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">ลูกค้า</h1>
          <p className="text-muted-foreground">จัดการข้อมูลลูกค้าและเครดิต</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              เพิ่มลูกค้า
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="id_card">เลขบัตรประชาชน *</Label>
                  <Input
                    id="id_card"
                    value={formData.id_card}
                    onChange={(e) =>
                      setFormData({ ...formData, id_card: e.target.value })
                    }
                    maxLength={13}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">โทรศัพท์</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">ที่อยู่</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="occupation">อาชีพ</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) =>
                      setFormData({ ...formData, occupation: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="salary">รายได้ต่อเดือน</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) =>
                      setFormData({ ...formData, salary: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="credit_limit">วงเงินเครดิต</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) =>
                      setFormData({ ...formData, credit_limit: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="credit_grade">เกรดเครดิต</Label>
                  <Select
                    value={formData.credit_grade}
                    onValueChange={(value: "A" | "B" | "C" | "F") =>
                      setFormData({ ...formData, credit_grade: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - ดี</SelectItem>
                      <SelectItem value="B">B - ปกติ</SelectItem>
                      <SelectItem value="C">C - เสี่ยง</SelectItem>
                      <SelectItem value="F">F - Blacklist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <Button type="submit">
                  {editingCustomer ? "อัปเดต" : "เพิ่ม"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, เลขบัตร, หรือเบอร์โทร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่พบข้อมูลลูกค้า
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>เลขบัตร</TableHead>
                    <TableHead>โทรศัพท์</TableHead>
                    <TableHead>อาชีพ</TableHead>
                    <TableHead className="text-right">วงเงินเครดิต</TableHead>
                    <TableHead className="text-center">เกรด</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {customer.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {customer.id_card}
                      </TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell>{customer.occupation || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(customer.credit_limit)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={CREDIT_GRADE_CONFIG[customer.credit_grade].color}
                        >
                          {CREDIT_GRADE_CONFIG[customer.credit_grade].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="w-4 h-4" />
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
    </div>
  );
};

export default Customers;
