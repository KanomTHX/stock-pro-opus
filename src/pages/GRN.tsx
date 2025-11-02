import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, PackagePlus } from "lucide-react";

interface GRNItem {
  product_id: string;
  product_name?: string;
  qty: number;
  unit_cost: number;
  vat_rate: number;
  sn_list: string[];
}

export default function GRN() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<GRNItem[]>([]);
  const [formData, setFormData] = useState({
    supplier_id: "",
    branch_id: "",
    note: "",
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: grnList } = useQuery({
    queryKey: ["grn-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grn_headers")
        .select(`
          *,
          suppliers(name),
          branches(name)
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const createGRN = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Generate GRN number
      const grnNo = `GRN-${Date.now()}`;

      // Insert GRN header
      const { data: grnHeader, error: headerError } = await supabase
        .from("grn_headers")
        .insert({
          grn_no: grnNo,
          supplier_id: formData.supplier_id || null,
          branch_id: formData.branch_id,
          received_by: userData.user.id,
          note: formData.note,
          status: "completed",
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // Insert GRN items
      const itemsToInsert = items.map((item) => ({
        grn_id: grnHeader.id,
        product_id: item.product_id,
        qty: item.qty,
        unit_cost: item.unit_cost,
        vat_rate: item.vat_rate,
        sn_list: item.sn_list.length > 0 ? item.sn_list : null,
      }));

      const { error: itemsError } = await supabase
        .from("grn_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Create movement logs
      for (const item of items) {
        await supabase.from("movement_logs").insert({
          action: "receive",
          ref_table: "grn_headers",
          ref_id: grnHeader.id,
          product_id: item.product_id,
          to_branch_id: formData.branch_id,
          qty: item.qty,
          actor_id: userData.user.id,
          note: formData.note,
        });
      }

      return grnHeader;
    },
    onSuccess: () => {
      toast.success("รับสินค้าเข้าเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["grn-list"] });
      setItems([]);
      setFormData({ supplier_id: "", branch_id: "", note: "" });
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const addItem = () => {
    setItems([
      ...items,
      {
        product_id: "",
        qty: 1,
        unit_cost: 0,
        vat_rate: 7,
        sn_list: [],
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof GRNItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "product_id" && products) {
      const product = products.find((p) => p.id === value);
      newItems[index].product_name = product?.name;
    }
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branch_id) {
      toast.error("กรุณาเลือกสาขา");
      return;
    }
    if (items.length === 0) {
      toast.error("กรุณาเพิ่มรายการสินค้า");
      return;
    }
    createGRN.mutate();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">รับสินค้าเข้า (GRN)</h1>
          <p className="text-muted-foreground">Goods Receiving Note - จัดการการรับสินค้าเข้าคลัง</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>สร้างใบรับสินค้าใหม่</CardTitle>
          <CardDescription>กรอกข้อมูลการรับสินค้าเข้าคลัง</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">ซัพพลายเออร์</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplier_id: value })
                  }
                >
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="เลือกซัพพลายเออร์" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">สาขา *</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branch_id: value })
                  }
                  required
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="เลือกสาขา" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">หมายเหตุ</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="หมายเหตุเพิ่มเติม"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>รายการสินค้า</Label>
                <Button type="button" onClick={addItem} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  เพิ่มรายการ
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="w-24">จำนวน</TableHead>
                      <TableHead className="w-32">ราคาต่อหน่วย</TableHead>
                      <TableHead className="w-24">VAT %</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) =>
                              updateItem(index, "product_id", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกสินค้า" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.sku} - {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              updateItem(index, "qty", parseInt(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={(e) =>
                              updateItem(index, "unit_cost", parseFloat(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.vat_rate}
                            onChange={(e) =>
                              updateItem(index, "vat_rate", parseFloat(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          ยังไม่มีรายการสินค้า
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setItems([]);
                  setFormData({ supplier_id: "", branch_id: "", note: "" });
                }}
              >
                ล้างข้อมูล
              </Button>
              <Button type="submit" disabled={createGRN.isPending}>
                <PackagePlus className="mr-2 h-4 w-4" />
                {createGRN.isPending ? "กำลังบันทึก..." : "บันทึกใบรับสินค้า"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ประวัติการรับสินค้า</CardTitle>
          <CardDescription>รายการ GRN ล่าสุด</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่</TableHead>
                <TableHead>ซัพพลายเออร์</TableHead>
                <TableHead>สาขา</TableHead>
                <TableHead>วันที่รับ</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grnList?.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-medium">{grn.grn_no}</TableCell>
                  <TableCell>{grn.suppliers?.name || "-"}</TableCell>
                  <TableCell>{grn.branches?.name}</TableCell>
                  <TableCell>
                    {new Date(grn.received_at).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      {grn.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!grnList || grnList.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    ยังไม่มีประวัติการรับสินค้า
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
