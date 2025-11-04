import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Building2, Phone, MapPin, Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [newBranch, setNewBranch] = useState({
    name: "",
    code: "",
    phone: "",
    address: "",
  });
  const [editBranch, setEditBranch] = useState({
    name: "",
    code: "",
    phone: "",
    address: "",
    is_active: true,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("code", { ascending: true });

      if (error) throw error;

      setBranches(data || []);
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลสาขาได้");
      console.error("Error fetching branches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBranch = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .insert([{
          name: newBranch.name,
          code: newBranch.code,
          phone: newBranch.phone || null,
          address: newBranch.address || null,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("สร้างสาขาเรียบร้อย");
      fetchBranches();
      setDialogOpen(false);
      setNewBranch({
        name: "",
        code: "",
        phone: "",
        address: "",
      });
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const updateBranch = useMutation({
    mutationFn: async () => {
      if (!selectedBranch) {
        console.error("No branch selected for update");
        return;
      }
      
      console.log("Updating branch:", selectedBranch.id, editBranch);
      
      const { data, error } = await supabase
        .from("branches")
        .update({
          name: editBranch.name,
          code: editBranch.code,
          phone: editBranch.phone || null,
          address: editBranch.address || null,
          is_active: editBranch.is_active,
        })
        .eq("id", selectedBranch.id)
        .select();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }
      
      console.log("Update successful:", data);
      return data;
    },
    onSuccess: () => {
      toast.success("อัปเดตสาขาเรียบร้อย");
      fetchBranches();
      setEditDialogOpen(false);
      setSelectedBranch(null);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const handleEditClick = (branch: Branch) => {
    setSelectedBranch(branch);
    setEditBranch({
      name: branch.name,
      code: branch.code,
      phone: branch.phone || "",
      address: branch.address || "",
      is_active: branch.is_active,
    });
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">
            สาขาทั้งหมด
          </h1>
          <p className="text-muted-foreground mt-1">
            รายการสาขาในระบบ
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มสาขา
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มสาขาใหม่</DialogTitle>
              <DialogDescription>กรอกข้อมูลสาขา</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch-name">ชื่อสาขา *</Label>
                <Input
                  id="branch-name"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  placeholder="ชื่อสาขา"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-code">รหัสสาขา *</Label>
                <Input
                  id="branch-code"
                  value={newBranch.code}
                  onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                  placeholder="BR001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="branch-phone"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                  placeholder="02-xxx-xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-address">ที่อยู่</Label>
                <Textarea
                  id="branch-address"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  placeholder="ที่อยู่สาขา"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!newBranch.name || !newBranch.code) {
                      toast.error("กรุณากรอกชื่อและรหัสสาขา");
                      return;
                    }
                    createBranch.mutate();
                  }}
                  disabled={createBranch.isPending}
                >
                  {createBranch.isPending ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Branches Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-card">
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">ไม่พบข้อมูลสาขา</h3>
            <p className="text-muted-foreground">
              ยังไม่มีสาขาในระบบ
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch, index) => (
            <Card
              key={branch.id}
              className="shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
              onClick={() => handleEditClick(branch)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-soft">
                      <Building2 className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{branch.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {branch.code}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={branch.is_active ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {branch.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {branch.address && (
                  <div className="flex gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      {branch.address}
                    </span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {branch.phone}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Branch Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลสาขา</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลสาขา {selectedBranch?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-branch-name">ชื่อสาขา *</Label>
              <Input
                id="edit-branch-name"
                value={editBranch.name}
                onChange={(e) => setEditBranch({ ...editBranch, name: e.target.value })}
                placeholder="ชื่อสาขา"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-code">รหัสสาขา *</Label>
              <Input
                id="edit-branch-code"
                value={editBranch.code}
                onChange={(e) => setEditBranch({ ...editBranch, code: e.target.value })}
                placeholder="BR001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-phone">เบอร์โทรศัพท์</Label>
              <Input
                id="edit-branch-phone"
                value={editBranch.phone}
                onChange={(e) => setEditBranch({ ...editBranch, phone: e.target.value })}
                placeholder="02-xxx-xxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-address">ที่อยู่</Label>
              <Textarea
                id="edit-branch-address"
                value={editBranch.address}
                onChange={(e) => setEditBranch({ ...editBranch, address: e.target.value })}
                placeholder="ที่อยู่สาขา"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-branch-active"
                checked={editBranch.is_active}
                onCheckedChange={(checked) => setEditBranch({ ...editBranch, is_active: checked })}
              />
              <Label htmlFor="edit-branch-active">เปิดใช้งาน</Label>
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
                  if (!editBranch.name || !editBranch.code) {
                    toast.error("กรุณากรอกชื่อและรหัสสาขา");
                    return;
                  }
                  updateBranch.mutate();
                }}
                disabled={updateBranch.isPending}
              >
                {updateBranch.isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Branches;