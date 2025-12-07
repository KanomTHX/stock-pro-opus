import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Plus, Edit, UserCheck } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  sales_commission_pct: number;
  collection_commission_pct: number;
  is_active: boolean;
  created_at: string;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    sales_commission_pct: "",
    collection_commission_pct: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");

      if (error) throw error;
      setEmployees((data as Employee[]) || []);
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลพนักงานได้");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const employeeData = {
        name: formData.name,
        role: formData.role,
        sales_commission_pct: parseFloat(formData.sales_commission_pct) || 0,
        collection_commission_pct: parseFloat(formData.collection_commission_pct) || 0,
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", editingEmployee.id);
        if (error) throw error;
        toast.success("อัปเดตข้อมูลพนักงานสำเร็จ");
      } else {
        const { error } = await supabase.from("employees").insert(employeeData);
        if (error) throw error;
        toast.success("เพิ่มพนักงานสำเร็จ");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      sales_commission_pct: "",
      collection_commission_pct: "",
    });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      role: employee.role,
      sales_commission_pct: employee.sales_commission_pct.toString(),
      collection_commission_pct: employee.collection_commission_pct.toString(),
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">พนักงาน</h1>
          <p className="text-muted-foreground">จัดการข้อมูลพนักงานและค่าคอมมิชชั่น</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              เพิ่มพนักงาน
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">ตำแหน่ง *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  placeholder="เช่น พนักงานขาย, พนักงานเก็บเงิน"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sales_commission_pct">ค่าคอม% (ขาย)</Label>
                  <Input
                    id="sales_commission_pct"
                    type="number"
                    step="0.01"
                    max="100"
                    value={formData.sales_commission_pct}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_commission_pct: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="collection_commission_pct">ค่าคอม% (เก็บเงิน)</Label>
                  <Input
                    id="collection_commission_pct"
                    type="number"
                    step="0.01"
                    max="100"
                    value={formData.collection_commission_pct}
                    onChange={(e) =>
                      setFormData({ ...formData, collection_commission_pct: e.target.value })
                    }
                  />
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
                  {editingEmployee ? "อัปเดต" : "เพิ่ม"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีข้อมูลพนักงาน
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead className="text-right">ค่าคอม% (ขาย)</TableHead>
                    <TableHead className="text-right">ค่าคอม% (เก็บเงิน)</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-muted-foreground" />
                          {employee.name}
                        </div>
                      </TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell className="text-right">
                        {employee.sales_commission_pct}%
                      </TableCell>
                      <TableCell className="text-right">
                        {employee.collection_commission_pct}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(employee)}
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

export default Employees;
