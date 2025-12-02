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
import { Plus, Trash2, PackageMinus } from "lucide-react";
import SerialNumberSelector from "@/components/SerialNumberSelector";

interface GIItem {
  product_id: string;
  product_name?: string;
  qty: number;
  sn_list: string[];
}

export default function GI() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<GIItem[]>([]);
  const [formData, setFormData] = useState({
    branch_id: "",
    purpose: "" as "sale" | "sample" | "service" | "adjustment",
    note: "",
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

  const { data: giList } = useQuery({
    queryKey: ["gi-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gi_headers")
        .select(`
          *,
          branches(name)
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const createGI = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Validate SNs
      for (const item of items) {
        if (item.sn_list.length !== item.qty) {
          throw new Error(`กรุณาเลือก SN ให้ครบถ้วนสำหรับสินค้า ${item.product_name}`);
        }
      }

      // Generate GI number
      const giNo = `GI-${Date.now()}`;

      // Insert GI header
      const { data: giHeader, error: headerError } = await supabase
        .from("gi_headers")
        .insert([{
          gi_no: giNo,
          branch_id: formData.branch_id,
          issued_by: userData.user.id,
          purpose: formData.purpose,
          note: formData.note,
          status: "completed",
        }])
        .select()
        .single();

      if (headerError) throw headerError;

      // Insert GI items
      const itemsToInsert = items.map((item) => ({
        gi_id: giHeader.id,
        product_id: item.product_id,
        qty: item.qty,
        sn_list: item.sn_list.length > 0 ? item.sn_list : null,
      }));

      const { error: itemsError } = await supabase
        .from("gi_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update serial numbers status to 'issued'
      for (const item of items) {
        for (const sn of item.sn_list) {
          await supabase
            .from("serial_numbers")
            .update({ 
              status: "issued",
              issued_date: new Date().toISOString()
            })
            .eq("sn", sn)
            .eq("product_id", item.product_id)
            .eq("branch_id", formData.branch_id);
        }
      }

      // Create movement logs
      for (const item of items) {
        await supabase.from("movement_logs").insert({
          action: "issue",
          ref_table: "gi_headers",
          ref_id: giHeader.id,
          product_id: item.product_id,
          from_branch_id: formData.branch_id,
          qty: item.qty,
          actor_id: userData.user.id,
          note: formData.note,
        });
      }

      return giHeader;
    },
    onSuccess: () => {
      toast.success("เบิกสินค้าออกเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["gi-list"] });
      setItems([]);
      setFormData({ branch_id: "", purpose: "sale", note: "" });
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
        sn_list: [],
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof GIItem, value: any) => {
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
    if (!formData.branch_id || !formData.purpose) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }
    if (items.length === 0) {
      toast.error("กรุณาเพิ่มรายการสินค้า");
      return;
    }
    createGI.mutate();
  };

  const purposeLabels = {
    sale: "ขาย",
    sample: "ตัวอย่าง",
    service: "บริการ",
    adjustment: "ปรับยอด",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">เบิกสินค้าออก (GI)</h1>
          <p className="text-muted-foreground">Goods Issue - จัดการการเบิกสินค้าออกจากคลัง</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>สร้างใบเบิกสินค้าใหม่</CardTitle>
          <CardDescription>กรอกข้อมูลการเบิกสินค้าออกจากคลัง</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="purpose">วัตถุประสงค์ *</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, purpose: value })
                  }
                  required
                >
                  <SelectTrigger id="purpose">
                    <SelectValue placeholder="เลือกวัตถุประสงค์" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">ขาย</SelectItem>
                    <SelectItem value="sample">ตัวอย่าง</SelectItem>
                    <SelectItem value="service">บริการ</SelectItem>
                    <SelectItem value="adjustment">ปรับยอด</SelectItem>
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
                      <TableHead className="w-32">จำนวน</TableHead>
                      <TableHead>Serial Numbers</TableHead>
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
                          {item.product_id && formData.branch_id && (
                            <SerialNumberSelector
                              productId={item.product_id}
                              branchId={formData.branch_id}
                              requiredQty={item.qty}
                              selectedSNs={item.sn_list}
                              onSNsChange={(sns) => updateItem(index, "sn_list", sns)}
                            />
                          )}
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
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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
                  setFormData({ branch_id: "", purpose: "sale", note: "" });
                }}
              >
                ล้างข้อมูล
              </Button>
              <Button type="submit" disabled={createGI.isPending}>
                <PackageMinus className="mr-2 h-4 w-4" />
                {createGI.isPending ? "กำลังบันทึก..." : "บันทึกใบเบิกสินค้า"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ประวัติการเบิกสินค้า</CardTitle>
          <CardDescription>รายการ GI ล่าสุด</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่</TableHead>
                <TableHead>สาขา</TableHead>
                <TableHead>วัตถุประสงค์</TableHead>
                <TableHead>วันที่เบิก</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giList?.map((gi) => (
                <TableRow key={gi.id}>
                  <TableCell className="font-medium">{gi.gi_no}</TableCell>
                  <TableCell>{gi.branches?.name}</TableCell>
                  <TableCell>{purposeLabels[gi.purpose as keyof typeof purposeLabels]}</TableCell>
                  <TableCell>
                    {new Date(gi.issued_at).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      {gi.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!giList || giList.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    ยังไม่มีประวัติการเบิกสินค้า
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
