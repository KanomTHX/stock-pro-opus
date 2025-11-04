import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Package, Grid, List } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  color: string | null;
  dimensions: string | null;
  material: string | null;
  unit: string;
  min_stock: number;
  track_by_sn: boolean;
  is_active: boolean;
  default_image_url: string | null;
  category_id: string | null;
  brand_id: string | null;
  categories: { id: string; name: string } | null;
  brands: { id: string; name: string } | null;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState({
    sku: "",
    name: "",
    description: "",
    color: "",
    dimensions: "",
    material: "",
    unit: "ชิ้น",
    min_stock: 0,
    track_by_sn: false,
    is_active: true,
    category_id: "",
    brand_id: "",
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from("brands").select("*").order("name");
    setBrands(data || []);
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          categories (id, name),
          brands (id, name)
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลสินค้าได้");
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) {
        console.error("No product selected for update");
        return;
      }
      
      console.log("Updating product:", selectedProduct.id, editProduct);
      
      const { data, error } = await supabase
        .from("products")
        .update({
          sku: editProduct.sku,
          name: editProduct.name,
          description: editProduct.description || null,
          color: editProduct.color || null,
          dimensions: editProduct.dimensions || null,
          material: editProduct.material || null,
          unit: editProduct.unit,
          min_stock: editProduct.min_stock,
          track_by_sn: editProduct.track_by_sn,
          is_active: editProduct.is_active,
          category_id: editProduct.category_id || null,
          brand_id: editProduct.brand_id || null,
        })
        .eq("id", selectedProduct.id)
        .select();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }
      
      console.log("Update successful:", data);
      return data;
    },
    onSuccess: () => {
      toast.success("อัปเดตสินค้าเรียบร้อย");
      fetchProducts();
      setEditDialogOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setEditProduct({
      sku: product.sku,
      name: product.name,
      description: product.description || "",
      color: product.color || "",
      dimensions: product.dimensions || "",
      material: product.material || "",
      unit: product.unit,
      min_stock: product.min_stock,
      track_by_sn: product.track_by_sn,
      is_active: product.is_active,
      category_id: product.category_id || "",
      brand_id: product.brand_id || "",
    });
    setEditDialogOpen(true);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">
            รายการสินค้า
          </h1>
          <p className="text-muted-foreground mt-1">
            จัดการและค้นหาสินค้าเฟอร์นิเจอร์
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาด้วย SKU, ชื่อสินค้า..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid/List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="w-full h-48 bg-muted animate-pulse rounded-lg" />
                  <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">ไม่พบสินค้า</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "ลองค้นหาด้วยคำอื่นดู"
                : "ยังไม่มีสินค้าในระบบ"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              : "space-y-4"
          }
        >
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              onClick={() => handleEditClick(product)}
            >
              <CardContent className={viewMode === "grid" ? "p-4" : "p-4 flex gap-4"}>
                {/* Image */}
                <div
                  className={
                    viewMode === "grid"
                      ? "w-full h-48 bg-muted rounded-lg mb-4 overflow-hidden"
                      : "w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0"
                  }
                >
                  {product.default_image_url ? (
                    <img
                      src={product.default_image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.categories && (
                      <Badge variant="secondary" className="text-xs">
                        {product.categories.name}
                      </Badge>
                    )}
                    {product.brands && (
                      <Badge variant="outline" className="text-xs">
                        {product.brands.name}
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    {product.color && (
                      <div>สี: {product.color}</div>
                    )}
                    {product.dimensions && (
                      <div>ขนาด: {product.dimensions}</div>
                    )}
                    <div>หน่วย: {product.unit}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลสินค้า</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลสินค้า {selectedProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU *</Label>
                <Input
                  id="edit-sku"
                  value={editProduct.sku}
                  onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })}
                  placeholder="SKU"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">ชื่อสินค้า *</Label>
                <Input
                  id="edit-name"
                  value={editProduct.name}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  placeholder="ชื่อสินค้า"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">รายละเอียด</Label>
              <Textarea
                id="edit-description"
                value={editProduct.description}
                onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                placeholder="รายละเอียดสินค้า"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">หมวดหมู่</Label>
                <Select
                  value={editProduct.category_id}
                  onValueChange={(value) => setEditProduct({ ...editProduct, category_id: value })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand">ยี่ห้อ</Label>
                <Select
                  value={editProduct.brand_id}
                  onValueChange={(value) => setEditProduct({ ...editProduct, brand_id: value })}
                >
                  <SelectTrigger id="edit-brand">
                    <SelectValue placeholder="เลือกยี่ห้อ" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
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
                <Label htmlFor="edit-color">สี</Label>
                <Input
                  id="edit-color"
                  value={editProduct.color}
                  onChange={(e) => setEditProduct({ ...editProduct, color: e.target.value })}
                  placeholder="สี"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dimensions">ขนาด</Label>
                <Input
                  id="edit-dimensions"
                  value={editProduct.dimensions}
                  onChange={(e) => setEditProduct({ ...editProduct, dimensions: e.target.value })}
                  placeholder="กว้าง x ยาว x สูง"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-material">วัสดุ</Label>
                <Input
                  id="edit-material"
                  value={editProduct.material}
                  onChange={(e) => setEditProduct({ ...editProduct, material: e.target.value })}
                  placeholder="วัสดุ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-unit">หน่วย</Label>
                <Input
                  id="edit-unit"
                  value={editProduct.unit}
                  onChange={(e) => setEditProduct({ ...editProduct, unit: e.target.value })}
                  placeholder="หน่วย"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-min-stock">สต็อกขั้นต่ำ</Label>
                <Input
                  id="edit-min-stock"
                  type="number"
                  value={editProduct.min_stock}
                  onChange={(e) => setEditProduct({ ...editProduct, min_stock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-track-sn"
                  checked={editProduct.track_by_sn}
                  onCheckedChange={(checked) => setEditProduct({ ...editProduct, track_by_sn: checked })}
                />
                <Label htmlFor="edit-track-sn">ติดตามด้วย Serial Number</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={editProduct.is_active}
                  onCheckedChange={(checked) => setEditProduct({ ...editProduct, is_active: checked })}
                />
                <Label htmlFor="edit-active">เปิดใช้งาน</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!editProduct.sku || !editProduct.name) {
                    toast.error("กรุณากรอก SKU และชื่อสินค้า");
                    return;
                  }
                  updateProduct.mutate();
                }}
                disabled={updateProduct.isPending}
              >
                {updateProduct.isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;