import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, MoreVertical, Plus, RefreshCw, Trash2, Eye, ExternalLink } from "lucide-react";
import type { BusinessAccountDto } from "@shared/dto";

interface DemoPage {
  id: string;
  businessAccountId: string;
  token: string;
  title: string | null;
  description: string | null;
  appearance: string | null;
  isActive: string;
  expiresAt: string | null;
  lastViewedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function SuperAdminDemo() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessAccountId: "",
    title: "",
    description: "",
    expiresAt: "",
  });

  const { data: demoPages = [], isLoading: isDemoPagesLoading } = useQuery<DemoPage[]>({
    queryKey: ["/api/super-admin/demo-pages"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/super-admin/demo-pages");
    },
  });

  const { data: businessAccounts = [] } = useQuery<BusinessAccountDto[]>({
    queryKey: ["/api/business-accounts"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/business-accounts");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/super-admin/demo-pages", data);
    },
    onSuccess: (newDemo) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/demo-pages"] });
      setIsCreateOpen(false);
      setFormData({ businessAccountId: "", title: "", description: "", expiresAt: "" });
      toast({
        title: "Demo Page Created",
        description: "The demo page has been created successfully.",
      });
      
      const demoUrl = `${window.location.origin}/demo/${newDemo.token}`;
      navigator.clipboard.writeText(demoUrl);
      toast({
        title: "Link Copied",
        description: "The demo link has been copied to your clipboard.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create demo page",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/super-admin/demo-pages/${id}`, { isActive });
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/super-admin/demo-pages"] });
      const previousPages = queryClient.getQueryData<DemoPage[]>(["/api/super-admin/demo-pages"]);
      
      queryClient.setQueryData<DemoPage[]>(["/api/super-admin/demo-pages"], (old) =>
        old?.map((page) => page.id === id ? { ...page, isActive: isActive ? "true" : "false" } : page)
      );
      
      return { previousPages };
    },
    onError: (error, variables, context) => {
      if (context?.previousPages) {
        queryClient.setQueryData(["/api/super-admin/demo-pages"], context.previousPages);
      }
      toast({
        title: "Error",
        description: "Failed to update demo page status",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/demo-pages"] });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/super-admin/demo-pages/${id}/regenerate-token`);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/demo-pages"] });
      const demoUrl = `${window.location.origin}/demo/${updated.token}`;
      navigator.clipboard.writeText(demoUrl);
      toast({
        title: "Token Regenerated",
        description: "New demo link copied to clipboard. The old link is now invalid.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate token",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/super-admin/demo-pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/demo-pages"] });
      setDeleteId(null);
      toast({
        title: "Demo Page Deleted",
        description: "The demo page has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete demo page",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = (token: string) => {
    const demoUrl = `${window.location.origin}/demo/${token}`;
    navigator.clipboard.writeText(demoUrl);
    toast({
      title: "Link Copied",
      description: "Demo link copied to clipboard",
    });
  };

  const handleOpenDemo = (token: string) => {
    window.open(`/demo/${token}`, "_blank");
  };

  const handleCreate = () => {
    if (!formData.businessAccountId || !formData.title) {
      toast({
        title: "Validation Error",
        description: "Business account and title are required",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const getBusinessName = (businessAccountId: string) => {
    return businessAccounts.find(b => b.id === businessAccountId)?.name || "Unknown";
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Demo Pages</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage shareable demo pages for business accounts
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Demo Page
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Demo Page</DialogTitle>
              <DialogDescription>
                Select a business account and create a shareable demo page
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="business">Business Account *</Label>
                <Select
                  value={formData.businessAccountId}
                  onValueChange={(value) => setFormData({ ...formData, businessAccountId: value })}
                >
                  <SelectTrigger id="business">
                    <SelectValue placeholder="Select business account" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Demo for Potential Client"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional notes about this demo..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expires">Expiration Date (Optional)</Label>
                <Input
                  id="expires"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Demo Page"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isDemoPagesLoading ? (
        <div className="text-center py-12">Loading demo pages...</div>
      ) : demoPages.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No demo pages created yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click "New Demo Page" to create your first demo
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Viewed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoPages.map((demo) => (
                <TableRow key={demo.id}>
                  <TableCell className="font-medium">
                    {getBusinessName(demo.businessAccountId)}
                  </TableCell>
                  <TableCell>{demo.title || "Untitled"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={demo.isActive === "true"}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: demo.id, isActive: checked })
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {demo.isActive === "true" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(demo.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {demo.lastViewedAt
                      ? format(new Date(demo.lastViewedAt), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyLink(demo.token)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDemo(demo.token)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Demo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => regenerateTokenMutation.mutate(demo.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate Token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(demo.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Demo Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The demo link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
