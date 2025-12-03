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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRightLeft, CheckCircle, Truck, Eye } from "lucide-react";
import SerialNumberSelector from "@/components/SerialNumberSelector";

interface TransferItem {
  product_id: string;
  product_name?: string;
  qty: number;
  sn_list: string[];
}

export default function Transfer() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<TransferItem[]>([]);
  const [formData, setFormData] = useState({
    from_branch_id: "",
    to_branch_id: "",
    note: "",
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [transferItems, setTransferItems] = useState<any[]>([]);

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

  const { data: transferList } = useQuery({
    queryKey: ["transfer-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfer_headers")
        .select(`
          *,
          from_branch:branches!transfer_headers_from_branch_id_fkey(name),
          to_branch:branches!transfer_headers_to_branch_id_fkey(name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const viewTransferDetails = async (transfer: any) => {
    setSelectedTransfer(transfer);
    const { data } = await supabase
      .from("transfer_items")
      .select(`*, products(name, sku)`)
      .eq("transfer_id", transfer.id);
    setTransferItems(data || []);
    setDetailDialogOpen(true);
  };

  const createTransfer = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Validate SNs
      for (const item of items) {
        if (item.sn_list.length !== item.qty) {
          throw new Error(`กรุณาเลือก SN ให้ครบถ้วนสำหรับสินค้า ${item.product_name}`);
        }
      }

      // Generate Transfer number
      const transferNo = `TR-${Date.now()}`;

      // Insert Transfer header
      const { data: transferHeader, error: headerError } = await supabase
        .from("transfer_headers")
        .insert([{
          transfer_no: transferNo,
          from_branch_id: formData.from_branch_id,
          to_branch_id: formData.to_branch_id,
          initiated_by: userData.user.id,
          note: formData.note,
          status: "pending",
        }])
        .select()
        .single();

      if (headerError) throw headerError;

      // Insert Transfer items
      const itemsToInsert = items.map((item) => ({
        transfer_id: transferHeader.id,
        product_id: item.product_id,
        qty: item.qty,
        sn_list: item.sn_list.length > 0 ? item.sn_list : null,
      }));

      const { error: itemsError } = await supabase
        .from("transfer_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update serial numbers status to 'transferred'
      for (const item of items) {
        for (const sn of item.sn_list) {
          await supabase
            .from("serial_numbers")
            .update({ status: "transferred" })
            .eq("sn", sn)
            .eq("product_id", item.product_id)
            .eq("branch_id", formData.from_branch_id);
        }
      }

      return transferHeader;
    },
    onSuccess: () => {
      toast.success("สร้างใบโอนสินค้าเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["transfer-list"] });
      setItems([]);
      setFormData({ from_branch_id: "", to_branch_id: "", note: "" });
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const approveTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("transfer_headers")
        .update({
          status: "in_transit",
        })
        .eq("id", transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("อนุมัติใบโอนเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["transfer-list"] });
    },
  });

  const shipTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("transfer_headers")
        .update({
          status: "in_transit",
        })
        .eq("id", transferId);

      if (error) throw error;

      // Create movement log for transfer_out
      const { data: transfer } = await supabase
        .from("transfer_headers")
        .select("*, transfer_items(*)")
        .eq("id", transferId)
        .single();

      if (transfer) {
        for (const item of transfer.transfer_items) {
          await supabase.from("movement_logs").insert({
            action: "transfer_out",
            ref_table: "transfer_headers",
            ref_id: transferId,
            product_id: item.product_id,
            from_branch_id: transfer.from_branch_id,
            to_branch_id: transfer.to_branch_id,
            qty: item.qty,
            actor_id: userData.user.id,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("จัดส่งสินค้าเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["transfer-list"] });
    },
  });

  const receiveTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Get transfer details
      const { data: transfer, error: transferError } = await supabase
        .from("transfer_headers")
        .select("*, transfer_items(*)")
        .eq("id", transferId)
        .single();

      if (transferError) throw transferError;

      // Update transfer status
      const { error } = await supabase
        .from("transfer_headers")
        .update({
          status: "completed",
          received_by: userData.user.id,
          received_at: new Date().toISOString(),
        })
        .eq("id", transferId);

      if (error) throw error;

      // Update serial numbers: move to destination branch
      if (transfer) {
        for (const item of transfer.transfer_items) {
          if (item.sn_list && item.sn_list.length > 0) {
            for (const sn of item.sn_list) {
              await supabase
                .from("serial_numbers")
                .update({
                  branch_id: transfer.to_branch_id,
                  status: "available",
                })
                .eq("sn", sn)
                .eq("product_id", item.product_id);
            }
          }

          // Create movement log for transfer_in
          await supabase.from("movement_logs").insert({
            action: "transfer_in",
            ref_table: "transfer_headers",
            ref_id: transferId,
            product_id: item.product_id,
            from_branch_id: transfer.from_branch_id,
            to_branch_id: transfer.to_branch_id,
            qty: item.qty,
            actor_id: userData.user.id,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("รับสินค้าเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["transfer-list"] });
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

  const updateItem = (index: number, field: keyof TransferItem, value: any) => {
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
    if (!formData.from_branch_id || !formData.to_branch_id) {
      toast.error("กรุณาเลือกสาขาต้นทางและปลายทาง");
      return;
    }
    if (formData.from_branch_id === formData.to_branch_id) {
      toast.error("สาขาต้นทางและปลายทางต้องไม่เหมือนกัน");
      return;
    }
    if (items.length === 0) {
      toast.error("กรุณาเพิ่มรายการสินค้า");
      return;
    }
    createTransfer.mutate();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "รอดำเนินการ", variant: "secondary" as const },
      in_transit: { label: "กำลังจัดส่ง", variant: "default" as const },
      completed: { label: "เสร็จสิ้น", variant: "default" as const },
      cancelled: { label: "ยกเลิก", variant: "destructive" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">โอนสินค้าข้ามสาขา</h1>
          <p className="text-muted-foreground">Stock Transfer - จัดการการโอนสินค้าระหว่างสาขา</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>สร้างใบโอนสินค้าใหม่</CardTitle>
          <CardDescription>กรอกข้อมูลการโอนสินค้าระหว่างสาขา</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-branch">จากสาขา *</Label>
                <Select
                  value={formData.from_branch_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, from_branch_id: value })
                  }
                  required
                >
                  <SelectTrigger id="from-branch">
                    <SelectValue placeholder="เลือกสาขาต้นทาง" />
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
                <Label htmlFor="to-branch">ไปยังสาขา *</Label>
                <Select
                  value={formData.to_branch_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, to_branch_id: value })
                  }
                  required
                >
                  <SelectTrigger id="to-branch">
                    <SelectValue placeholder="เลือกสาขาปลายทาง" />
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
                          {item.product_id && formData.from_branch_id && (
                            <SerialNumberSelector
                              productId={item.product_id}
                              branchId={formData.from_branch_id}
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
                  setFormData({ from_branch_id: "", to_branch_id: "", note: "" });
                }}
              >
                ล้างข้อมูล
              </Button>
              <Button type="submit" disabled={createTransfer.isPending}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {createTransfer.isPending ? "กำลังบันทึก..." : "สร้างใบโอนสินค้า"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ประวัติการโอนสินค้า</CardTitle>
          <CardDescription>รายการโอนสินค้าล่าสุด</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่</TableHead>
                <TableHead>จากสาขา</TableHead>
                <TableHead>ไปยังสาขา</TableHead>
                <TableHead>วันที่สร้าง</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>การจัดการ</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferList?.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="font-medium">{transfer.transfer_no}</TableCell>
                  <TableCell>{transfer.from_branch?.name}</TableCell>
                  <TableCell>{transfer.to_branch?.name}</TableCell>
                  <TableCell>
                    {new Date(transfer.created_at).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {transfer.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shipTransfer.mutate(transfer.id)}
                        >
                          <Truck className="h-4 w-4 mr-1" />
                          จัดส่ง
                        </Button>
                      )}
                      {transfer.status === "in_transit" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => receiveTransfer.mutate(transfer.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          รับสินค้า
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => viewTransferDetails(transfer)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!transferList || transferList.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    ยังไม่มีประวัติการโอนสินค้า
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>รายละเอียดใบโอนสินค้า {selectedTransfer?.transfer_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">จากสาขา:</span> {selectedTransfer?.from_branch?.name}</div>
              <div><span className="text-muted-foreground">ไปยังสาขา:</span> {selectedTransfer?.to_branch?.name}</div>
              <div><span className="text-muted-foreground">วันที่สร้าง:</span> {selectedTransfer?.created_at && new Date(selectedTransfer.created_at).toLocaleString("th-TH")}</div>
              <div><span className="text-muted-foreground">สถานะ:</span> {getStatusBadge(selectedTransfer?.status)}</div>
              {selectedTransfer?.note && <div className="col-span-2"><span className="text-muted-foreground">หมายเหตุ:</span> {selectedTransfer.note}</div>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>Serial Numbers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.products?.sku} - {item.products?.name}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell className="text-xs">{item.sn_list?.join(", ") || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
