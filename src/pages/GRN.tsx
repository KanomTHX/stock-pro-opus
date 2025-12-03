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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, PackagePlus, ImagePlus, Eye } from "lucide-react";

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
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    code: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    description: "",
    color: "",
    dimensions: "",
    material: "",
    unit: "ชิ้น",
    min_stock: 0,
    track_by_sn: false,
    category_id: "",
    brand_id: "",
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [grnAttachment, setGrnAttachment] = useState<File | null>(null);
  const [grnAttachmentPreview, setGrnAttachmentPreview] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<any>(null);
  const [grnItems, setGrnItems] = useState<any[]>([]);

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

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
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
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const viewGRNDetails = async (grn: any) => {
    setSelectedGRN(grn);
    const { data } = await supabase
      .from("grn_items")
      .select(`*, products(name, sku)`)
      .eq("grn_id", grn.id);
    setGrnItems(data || []);
    setDetailDialogOpen(true);
  };

  const createSupplier = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .insert([{
          name: newSupplier.name,
          code: newSupplier.code,
          contact_person: newSupplier.contact_person || null,
          phone: newSupplier.phone || null,
          email: newSupplier.email || null,
          address: newSupplier.address || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("สร้างซัพพลายเออร์เรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setFormData({ ...formData, supplier_id: data.id });
      setSupplierDialogOpen(false);
      setNewSupplier({
        name: "",
        code: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
      });
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (productImage) {
        const fileExt = productImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, productImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create product
      const { data, error } = await supabase
        .from("products")
        .insert([{
          sku: newProduct.sku,
          name: newProduct.name,
          description: newProduct.description || null,
          color: newProduct.color || null,
          dimensions: newProduct.dimensions || null,
          material: newProduct.material || null,
          unit: newProduct.unit,
          min_stock: newProduct.min_stock,
          track_by_sn: newProduct.track_by_sn,
          category_id: newProduct.category_id || null,
          brand_id: newProduct.brand_id || null,
          default_image_url: imageUrl,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create product image record if image was uploaded
      if (imageUrl) {
        const { data: userData } = await supabase.auth.getUser();
        await supabase.from("product_images").insert({
          product_id: data.id,
          url: imageUrl,
          is_primary: true,
          uploaded_by: userData.user?.id || null,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success("สร้างสินค้าเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProductDialogOpen(false);
      setNewProduct({
        sku: "",
        name: "",
        description: "",
        color: "",
        dimensions: "",
        material: "",
        unit: "ชิ้น",
        min_stock: 0,
        track_by_sn: false,
        category_id: "",
        brand_id: "",
      });
      setProductImage(null);
      setImagePreview(null);
      
      // Auto-select the newly created product
      if (items.length > 0 && !items[items.length - 1].product_id) {
        const newItems = [...items];
        newItems[newItems.length - 1].product_id = data.id;
        newItems[newItems.length - 1].product_name = data.name;
        setItems(newItems);
      }
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const createGRN = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      let attachmentUrl: string | null = null;

      // Upload GRN attachment if provided
      if (grnAttachment) {
        const fileExt = grnAttachment.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('grn-attachments')
          .upload(filePath, grnAttachment);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('grn-attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
      }

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
          attachment_url: attachmentUrl,
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

      // Update stock_by_branch and create movement logs
      for (const item of items) {
        // Insert serial numbers into serial_numbers table
        if (item.sn_list && item.sn_list.length > 0) {
          const serialNumberRecords = item.sn_list.map((sn) => ({
            sn: sn,
            product_id: item.product_id,
            branch_id: formData.branch_id,
            status: "available",
            received_date: new Date().toISOString(),
          }));

          const { error: snError } = await supabase
            .from("serial_numbers")
            .insert(serialNumberRecords);

          if (snError) throw snError;
        }

        // Update stock
        const { data: existingStock } = await supabase
          .from("stock_by_branch")
          .select("qty")
          .eq("product_id", item.product_id)
          .eq("branch_id", formData.branch_id)
          .maybeSingle();

        if (existingStock) {
          await supabase
            .from("stock_by_branch")
            .update({ qty: existingStock.qty + item.qty })
            .eq("product_id", item.product_id)
            .eq("branch_id", formData.branch_id);
        } else {
          await supabase
            .from("stock_by_branch")
            .insert({
              product_id: item.product_id,
              branch_id: formData.branch_id,
              qty: item.qty,
            });
        }

        // Create movement log
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
      setGrnAttachment(null);
      setGrnAttachmentPreview(null);
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const generateSerialNumber = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SN${timestamp}${random}`;
  };

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
    // Auto-generate serial numbers when qty changes
    if (field === "qty") {
      const qty = parseInt(value) || 0;
      const serialNumbers = [];
      for (let i = 0; i < qty; i++) {
        serialNumbers.push(generateSerialNumber());
      }
      newItems[index].sn_list = serialNumbers;
    }
    setItems(newItems);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) { // 5MB
        toast.error("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB");
        return;
      }
      setProductImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGrnAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10485760) { // 10MB
        toast.error("ไฟล์เอกสารต้องมีขนาดไม่เกิน 10MB");
        return;
      }
      setGrnAttachment(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGrnAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    
    // ตรวจสอบว่าทุก item มี Serial Number ครบถ้วน
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        toast.error(`กรุณาเลือกสินค้าสำหรับรายการที่ ${i + 1}`);
        return;
      }
      if (item.qty <= 0) {
        toast.error(`จำนวนสินค้าต้องมากกว่า 0 สำหรับรายการที่ ${i + 1}`);
        return;
      }
      if (!item.sn_list || item.sn_list.length === 0) {
        toast.error(`กรุณาระบุ Serial Number สำหรับ ${item.product_name || 'สินค้า'} (รายการที่ ${i + 1})`);
        return;
      }
      if (item.sn_list.length !== item.qty) {
        toast.error(`จำนวน Serial Number (${item.sn_list.length}) ไม่ตรงกับจำนวนสินค้า (${item.qty}) สำหรับ ${item.product_name || 'สินค้า'}`);
        return;
      }
      // ตรวจสอบว่า Serial Number ไม่ซ้ำกันภายในรายการเดียวกัน
      const uniqueSN = new Set(item.sn_list.filter(sn => sn.trim() !== ''));
      if (uniqueSN.size !== item.sn_list.length) {
        toast.error(`พบ Serial Number ซ้ำกันในรายการ ${item.product_name || 'สินค้า'}`);
        return;
      }
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="supplier">ซัพพลายเออร์</Label>
                  <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        สร้างซัพพลายเออร์
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>สร้างซัพพลายเออร์ใหม่</DialogTitle>
                        <DialogDescription>กรอกข้อมูลซัพพลายเออร์</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="supplier-name">ชื่อซัพพลายเออร์ *</Label>
                          <Input
                            id="supplier-name"
                            value={newSupplier.name}
                            onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                            placeholder="ชื่อซัพพลายเออร์"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supplier-code">รหัสซัพพลายเออร์ *</Label>
                          <Input
                            id="supplier-code"
                            value={newSupplier.code}
                            onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value })}
                            placeholder="SUP001"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supplier-contact">ผู้ติดต่อ</Label>
                          <Input
                            id="supplier-contact"
                            value={newSupplier.contact_person}
                            onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                            placeholder="ชื่อผู้ติดต่อ"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supplier-phone">เบอร์โทรศัพท์</Label>
                          <Input
                            id="supplier-phone"
                            value={newSupplier.phone}
                            onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                            placeholder="02-xxx-xxxx"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supplier-email">อีเมล</Label>
                          <Input
                            id="supplier-email"
                            type="email"
                            value={newSupplier.email}
                            onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supplier-address">ที่อยู่</Label>
                          <Textarea
                            id="supplier-address"
                            value={newSupplier.address}
                            onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                            placeholder="ที่อยู่ซัพพลายเออร์"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSupplierDialogOpen(false)}
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (!newSupplier.name || !newSupplier.code) {
                                toast.error("กรุณากรอกชื่อและรหัสซัพพลายเออร์");
                                return;
                              }
                              createSupplier.mutate();
                            }}
                            disabled={createSupplier.isPending}
                          >
                            {createSupplier.isPending ? "กำลังบันทึก..." : "บันทึก"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
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

            <div className="space-y-2">
              <Label htmlFor="grn-attachment">รูปภาพใบรับสินค้า (หลักฐานการรับสินค้า)</Label>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('grn-attachment')?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    อัพโหลดรูปภาพ
                  </Button>
                  <Input
                    id="grn-attachment"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={handleGrnAttachmentChange}
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {grnAttachment ? grnAttachment.name : "ไม่ได้เลือกไฟล์"}
                  </span>
                </div>
                {grnAttachmentPreview && grnAttachment?.type.startsWith('image/') && (
                  <div className="relative w-full max-w-md h-48 border rounded-lg overflow-hidden">
                    <img
                      src={grnAttachmentPreview}
                      alt="GRN Attachment Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  รองรับไฟล์ JPG, PNG, WEBP, PDF ขนาดไม่เกิน 10MB
                </p>
              </div>
            </div>

              <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>รายการสินค้า (ต้องระบุ Serial Number ทุกรายการ) *</Label>
                <div className="flex gap-2">
                  <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" size="sm" variant="secondary">
                        <Plus className="mr-2 h-4 w-4" />
                        เพิ่มข้อมูลสินค้าใหม่
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>เพิ่มข้อมูลสินค้าใหม่</DialogTitle>
                        <DialogDescription>กรอกข้อมูลสินค้าและอัพโหลดรูปภาพ</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product-sku">SKU *</Label>
                            <Input
                              id="product-sku"
                              value={newProduct.sku}
                              onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                              placeholder="PRD-001"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-name">ชื่อสินค้า *</Label>
                            <Input
                              id="product-name"
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                              placeholder="ชื่อสินค้า"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="product-description">รายละเอียด</Label>
                          <Textarea
                            id="product-description"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                            placeholder="รายละเอียดสินค้า"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product-category">หมวดหมู่</Label>
                            <Select
                              value={newProduct.category_id}
                              onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value })}
                            >
                              <SelectTrigger id="product-category">
                                <SelectValue placeholder="เลือกหมวดหมู่" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-brand">ยี่ห้อ</Label>
                            <Select
                              value={newProduct.brand_id}
                              onValueChange={(value) => setNewProduct({ ...newProduct, brand_id: value })}
                            >
                              <SelectTrigger id="product-brand">
                                <SelectValue placeholder="เลือกยี่ห้อ" />
                              </SelectTrigger>
                              <SelectContent>
                                {brands?.map((brand) => (
                                  <SelectItem key={brand.id} value={brand.id}>
                                    {brand.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product-color">สี</Label>
                            <Input
                              id="product-color"
                              value={newProduct.color}
                              onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                              placeholder="สี"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-dimensions">ขนาด</Label>
                            <Input
                              id="product-dimensions"
                              value={newProduct.dimensions}
                              onChange={(e) => setNewProduct({ ...newProduct, dimensions: e.target.value })}
                              placeholder="กว้าง x ยาว x สูง"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-material">วัสดุ</Label>
                            <Input
                              id="product-material"
                              value={newProduct.material}
                              onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                              placeholder="วัสดุ"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product-unit">หน่วย</Label>
                            <Input
                              id="product-unit"
                              value={newProduct.unit}
                              onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                              placeholder="ชิ้น"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product-min-stock">สต็อกขั้นต่ำ</Label>
                            <Input
                              id="product-min-stock"
                              type="number"
                              value={newProduct.min_stock}
                              onChange={(e) => setNewProduct({ ...newProduct, min_stock: parseInt(e.target.value) || 0 })}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="product-track-sn"
                              checked={newProduct.track_by_sn}
                              onCheckedChange={(checked) => setNewProduct({ ...newProduct, track_by_sn: checked })}
                            />
                            <Label htmlFor="product-track-sn">ติดตามด้วย Serial Number</Label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="product-image">รูปภาพสินค้า</Label>
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('product-image')?.click()}
                              >
                                <ImagePlus className="mr-2 h-4 w-4" />
                                เลือกรูปภาพ
                              </Button>
                              <Input
                                id="product-image"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                              <span className="text-sm text-muted-foreground">
                                {productImage ? productImage.name : "ไม่ได้เลือกไฟล์"}
                              </span>
                            </div>
                            {imagePreview && (
                              <div className="relative w-full max-w-md h-48 border rounded-lg overflow-hidden">
                                <img
                                  src={imagePreview}
                                  alt="Product Preview"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              รองรับไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setProductDialogOpen(false);
                              setProductImage(null);
                              setImagePreview(null);
                            }}
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (!newProduct.sku || !newProduct.name) {
                                toast.error("กรุณากรอก SKU และชื่อสินค้า");
                                return;
                              }
                              createProduct.mutate();
                            }}
                            disabled={createProduct.isPending}
                          >
                            {createProduct.isPending ? "กำลังบันทึก..." : "บันทึกสินค้า"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button type="button" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มรายการ
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="w-24">จำนวน</TableHead>
                      <TableHead className="w-32">ราคาต่อหน่วย</TableHead>
                      <TableHead className="w-24">VAT %</TableHead>
                      <TableHead>Serial Numbers (บังคับ) *</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <>
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
                            <div className="flex flex-col gap-1">
                              <div className="text-xs font-medium text-muted-foreground">
                                {item.sn_list.length} / {item.qty} SN
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newItems = [...items];
                                  // Auto-generate if empty
                                  if (newItems[index].sn_list.length === 0) {
                                    const serialNumbers = [];
                                    for (let i = 0; i < newItems[index].qty; i++) {
                                      serialNumbers.push(generateSerialNumber());
                                    }
                                    newItems[index].sn_list = serialNumbers;
                                    setItems(newItems);
                                  }
                                }}
                              >
                                {item.sn_list.length > 0 ? 'แสดง SN' : 'สร้าง SN อัตโนมัติ'}
                              </Button>
                            </div>
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
                        {item.sn_list.length > 0 && (
                          <TableRow key={`${index}-sn`}>
                            <TableCell colSpan={6} className="bg-muted/30">
                              <div className="p-2">
                                <Label className="text-xs font-semibold mb-2 block">
                                  Serial Numbers สำหรับ {item.product_name || 'สินค้า'} ({item.sn_list.length} รายการ)
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                  {item.sn_list.map((sn, snIndex) => (
                                    <Input
                                      key={snIndex}
                                      value={sn}
                                      onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index].sn_list[snIndex] = e.target.value;
                                        setItems(newItems);
                                      }}
                                      placeholder={`SN ${snIndex + 1}`}
                                      className="text-xs"
                                    />
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                <TableHead className="w-16"></TableHead>
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
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => viewGRNDetails(grn)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!grnList || grnList.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    ยังไม่มีประวัติการรับสินค้า
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
            <DialogTitle>รายละเอียดใบรับสินค้า {selectedGRN?.grn_no}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">ซัพพลายเออร์:</span> {selectedGRN?.suppliers?.name || "-"}</div>
              <div><span className="text-muted-foreground">สาขา:</span> {selectedGRN?.branches?.name}</div>
              <div><span className="text-muted-foreground">วันที่รับ:</span> {selectedGRN?.received_at && new Date(selectedGRN.received_at).toLocaleString("th-TH")}</div>
              <div><span className="text-muted-foreground">สถานะ:</span> {selectedGRN?.status}</div>
              {selectedGRN?.note && <div className="col-span-2"><span className="text-muted-foreground">หมายเหตุ:</span> {selectedGRN.note}</div>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>ราคา/หน่วย</TableHead>
                  <TableHead>Serial Numbers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grnItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.products?.sku} - {item.products?.name}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>{item.unit_cost?.toLocaleString()} บาท</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{item.sn_list?.join(", ") || "-"}</TableCell>
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
