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
import { Search, Package, Grid, List, MapPin, Plus, Image, X, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  position: number;
}

interface StockByBranch {
  branch_id: string;
  sn_count: number;
  branch_name: string;
  branch_code: string;
}

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
  stock_by_branch?: StockByBranch[];
  product_images?: ProductImage[];
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
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
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [addBrandDialogOpen, setAddBrandDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDescription, setNewBrandDescription] = useState("");
  
  // Image management states
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<ProductImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
    fetchBranches();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from("brands").select("*").order("name");
    setBrands(data || []);
  };

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setBranches(data || []);
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      
      // Fetch products with categories, brands, and product_images
      const { data: productsData, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (id, name),
          brands (id, name),
          product_images (id, url, is_primary, position)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch serial numbers count per product per branch
      const { data: snData, error: snError } = await supabase
        .from("serial_numbers")
        .select("product_id, branch_id")
        .eq("status", "available");

      if (snError) throw snError;

      // Fetch branches for mapping
      const { data: branchesData } = await supabase
        .from("branches")
        .select("id, name, code")
        .eq("is_active", true);

      const branchMap = new Map(branchesData?.map(b => [b.id, b]) || []);

      // Group SN counts by product_id and branch_id
      const snCountMap = new Map<string, Map<string, number>>();
      snData?.forEach(sn => {
        if (!sn.branch_id) return;
        if (!snCountMap.has(sn.product_id)) {
          snCountMap.set(sn.product_id, new Map());
        }
        const branchCounts = snCountMap.get(sn.product_id)!;
        branchCounts.set(sn.branch_id, (branchCounts.get(sn.branch_id) || 0) + 1);
      });

      // Map products with SN counts
      const productsWithStock = productsData?.map(product => {
        const branchCounts = snCountMap.get(product.id);
        const stock_by_branch: StockByBranch[] = [];
        
        if (branchCounts) {
          branchCounts.forEach((count, branchId) => {
            const branch = branchMap.get(branchId);
            if (branch) {
              stock_by_branch.push({
                branch_id: branchId,
                sn_count: count,
                branch_name: branch.name,
                branch_code: branch.code,
              });
            }
          });
        }

        return {
          ...product,
          stock_by_branch,
        };
      }) || [];

      setProducts(productsWithStock);
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
      
      // Update product details
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

      // Get current branches for this product
      const { data: currentStock } = await supabase
        .from("stock_by_branch")
        .select("branch_id")
        .eq("product_id", selectedProduct.id);

      const currentBranchIds = currentStock?.map(s => s.branch_id) || [];
      
      // Find branches to add and remove
      const branchesToAdd = selectedBranches.filter(b => !currentBranchIds.includes(b));
      const branchesToRemove = currentBranchIds.filter(b => !selectedBranches.includes(b));

      // Add new branches
      if (branchesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("stock_by_branch")
          .insert(
            branchesToAdd.map(branch_id => ({
              product_id: selectedProduct.id,
              branch_id: branch_id,
              qty: 0,
            }))
          );

        if (insertError) {
          console.error("Error adding branches:", insertError);
          throw insertError;
        }
      }

      // Remove branches
      if (branchesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("stock_by_branch")
          .delete()
          .eq("product_id", selectedProduct.id)
          .in("branch_id", branchesToRemove);

        if (deleteError) {
          console.error("Error removing branches:", deleteError);
          throw deleteError;
        }
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

  const addCategory = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: newCategoryName,
          description: newCategoryDescription || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("เพิ่มหมวดหมู่เรียบร้อย");
      fetchCategories();
      setEditProduct({ ...editProduct, category_id: data.id });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setAddCategoryDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const addBrand = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .insert({
          name: newBrandName,
          description: newBrandDescription || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("เพิ่มยี่ห้อเรียบร้อย");
      fetchBrands();
      setEditProduct({ ...editProduct, brand_id: data.id });
      setNewBrandName("");
      setNewBrandDescription("");
      setAddBrandDialogOpen(false);
    },
    onError: (error: Error) => {
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
    // Set selected branches from stock_by_branch
    const branchIds = product.stock_by_branch?.map(s => s.branch_id) || [];
    setSelectedBranches(branchIds);
    // Set product images
    setProductImages(product.product_images?.sort((a, b) => a.position - b.position) || []);
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProduct || !e.target.files || e.target.files.length === 0) return;
    
    if (productImages.length >= 3) {
      toast.error("สามารถอัปโหลดรูปภาพได้สูงสุด 3 รูป");
      return;
    }

    const file = e.target.files[0];
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("รองรับเฉพาะไฟล์ JPEG, PNG, WEBP");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("ขนาดไฟล์ต้องไม่เกิน 10MB");
      return;
    }

    setImageUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedProduct.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      const newPosition = productImages.length;
      const isPrimary = productImages.length === 0;

      const { data: imageData, error: insertError } = await supabase
        .from("product_images")
        .insert({
          product_id: selectedProduct.id,
          url: urlData.publicUrl,
          is_primary: isPrimary,
          position: newPosition,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setProductImages([...productImages, imageData]);
      
      // Update default_image_url if this is the first image
      if (isPrimary) {
        await supabase
          .from("products")
          .update({ default_image_url: urlData.publicUrl })
          .eq("id", selectedProduct.id);
      }

      toast.success("อัปโหลดรูปภาพเรียบร้อย");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const imageToDelete = productImages.find(img => img.id === imageId);
      if (!imageToDelete) return;

      await supabase.from("product_images").delete().eq("id", imageId);

      const remainingImages = productImages.filter(img => img.id !== imageId);
      
      // If we deleted the primary image, set the first remaining as primary
      if (imageToDelete.is_primary && remainingImages.length > 0) {
        await supabase
          .from("product_images")
          .update({ is_primary: true })
          .eq("id", remainingImages[0].id);
        
        remainingImages[0].is_primary = true;
        
        await supabase
          .from("products")
          .update({ default_image_url: remainingImages[0].url })
          .eq("id", selectedProduct?.id);
      } else if (remainingImages.length === 0 && selectedProduct) {
        await supabase
          .from("products")
          .update({ default_image_url: null })
          .eq("id", selectedProduct.id);
      }

      setProductImages(remainingImages);
      toast.success("ลบรูปภาพเรียบร้อย");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("ลบรูปภาพไม่สำเร็จ");
    }
  };

  const openLightbox = (images: ProductImage[], startIndex: number = 0, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length === 0) return;
    setLightboxImages(images.sort((a, b) => a.position - b.position));
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBranch =
      selectedBranch === "all" ||
      product.stock_by_branch?.some((stock) => stock.branch_id === selectedBranch);
    
    return matchesSearch && matchesBranch;
  });

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

      {/* Search and Filter */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาด้วย SKU, ชื่อสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="pl-10">
              <SelectValue placeholder="ทุกสาขา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสาขา</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                  className={`relative group cursor-pointer ${
                    viewMode === "grid"
                      ? "w-full h-48 bg-muted rounded-lg mb-4 overflow-hidden"
                      : "w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0"
                  }`}
                  onClick={(e) => {
                    if (product.product_images && product.product_images.length > 0) {
                      openLightbox(product.product_images, 0, e);
                    }
                  }}
                >
                  {product.default_image_url ? (
                    <>
                      <img
                        src={product.default_image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {product.product_images && product.product_images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs font-medium">
                          <Image className="w-3 h-3 inline mr-1" />
                          {product.product_images.length}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Image className="w-8 h-8 text-foreground" />
                      </div>
                    </>
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
                    {product.stock_by_branch && product.stock_by_branch.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="font-medium text-foreground mb-1">สต็อกตามสาขา (SN):</div>
                        {product.stock_by_branch.map((stock) => (
                          <div key={stock.branch_id} className="flex justify-between">
                            <span>{stock.branch_name}:</span>
                            <span className="font-medium">{stock.sn_count} {product.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                <div className="flex gap-2">
                  <Select
                    value={editProduct.category_id}
                    onValueChange={(value) => setEditProduct({ ...editProduct, category_id: value })}
                  >
                    <SelectTrigger id="edit-category" className="flex-1">
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
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setAddCategoryDialogOpen(true)}
                    title="เพิ่มหมวดหมู่ใหม่"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand">ยี่ห้อ</Label>
                <div className="flex gap-2">
                  <Select
                    value={editProduct.brand_id}
                    onValueChange={(value) => setEditProduct({ ...editProduct, brand_id: value })}
                  >
                    <SelectTrigger id="edit-brand" className="flex-1">
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
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setAddBrandDialogOpen(true)}
                    title="เพิ่มยี่ห้อใหม่"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
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

            {/* Product Images */}
            <div className="space-y-2">
              <Label>รูปภาพสินค้า (สูงสุด 3 รูป)</Label>
              <div className="grid grid-cols-3 gap-2">
                {productImages.map((img, index) => (
                  <div key={img.id} className="relative aspect-square bg-muted rounded-lg overflow-hidden group">
                    <img
                      src={img.url}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openLightbox(productImages, index)}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {img.is_primary && (
                      <Badge className="absolute bottom-1 left-1 text-xs" variant="secondary">
                        หลัก
                      </Badge>
                    )}
                  </div>
                ))}
                {productImages.length < 3 && (
                  <label className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors border-2 border-dashed border-border">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                    />
                    {imageUploading ? (
                      <div className="text-sm text-muted-foreground">กำลังอัปโหลด...</div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">เพิ่มรูป</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>สาขาที่มีสินค้านี้</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {branches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ไม่มีสาขาในระบบ</p>
                ) : (
                  branches.map((branch) => (
                    <div key={branch.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`branch-${branch.id}`}
                        checked={selectedBranches.includes(branch.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBranches([...selectedBranches, branch.id]);
                          } else {
                            setSelectedBranches(selectedBranches.filter(id => id !== branch.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-input"
                      />
                      <Label htmlFor={`branch-${branch.id}`} className="cursor-pointer font-normal">
                        {branch.name} ({branch.code})
                      </Label>
                    </div>
                  ))
                )}
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

      {/* Add Category Dialog */}
      <Dialog open={addCategoryDialogOpen} onOpenChange={setAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มหมวดหมู่ใหม่</DialogTitle>
            <DialogDescription>เพิ่มหมวดหมู่สินค้าใหม่ลงในระบบ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">ชื่อหมวดหมู่ *</Label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="เช่น โต๊ะ, เก้าอี้"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category-description">รายละเอียด</Label>
              <Textarea
                id="new-category-description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="รายละเอียดของหมวดหมู่"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddCategoryDialogOpen(false);
                  setNewCategoryName("");
                  setNewCategoryDescription("");
                }}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!newCategoryName.trim()) {
                    toast.error("กรุณากรอกชื่อหมวดหมู่");
                    return;
                  }
                  addCategory.mutate();
                }}
                disabled={addCategory.isPending}
              >
                {addCategory.isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Brand Dialog */}
      <Dialog open={addBrandDialogOpen} onOpenChange={setAddBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มยี่ห้อใหม่</DialogTitle>
            <DialogDescription>เพิ่มยี่ห้อสินค้าใหม่ลงในระบบ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-brand-name">ชื่อยี่ห้อ *</Label>
              <Input
                id="new-brand-name"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="เช่น IKEA, Index Living Mall"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-brand-description">รายละเอียด</Label>
              <Textarea
                id="new-brand-description"
                value={newBrandDescription}
                onChange={(e) => setNewBrandDescription(e.target.value)}
                placeholder="รายละเอียดของยี่ห้อ"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddBrandDialogOpen(false);
                  setNewBrandName("");
                  setNewBrandDescription("");
                }}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!newBrandName.trim()) {
                    toast.error("กรุณากรอกชื่อยี่ห้อ");
                    return;
                  }
                  addBrand.mutate();
                }}
                disabled={addBrand.isPending}
              >
                {addBrand.isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-background/95 backdrop-blur">
          <div className="relative">
            {lightboxImages.length > 0 && (
              <>
                <img
                  src={lightboxImages[lightboxIndex]?.url}
                  alt={`Image ${lightboxIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                {lightboxImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length)}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setLightboxIndex((lightboxIndex + 1) % lightboxImages.length)}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {lightboxImages.map((_, idx) => (
                        <button
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === lightboxIndex ? "bg-primary" : "bg-muted-foreground/50"
                          }`}
                          onClick={() => setLightboxIndex(idx)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;