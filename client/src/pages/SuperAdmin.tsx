import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Building2, Pencil, Copy, Check, ShieldCheck, ShoppingBag, Calendar, Sparkles, MoreVertical, Eye, Mic } from "lucide-react";
import type { BusinessAccountDto } from "@shared/dto/businessAccount";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function SuperAdmin() {
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessWebsite, setNewBusinessWebsite] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  
  const [editingBusiness, setEditingBusiness] = useState<BusinessAccountDto | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editBusinessWebsite, setEditBusinessWebsite] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ username: string; tempPassword: string } | null>(null);
  
  const [viewPasswordBusiness, setViewPasswordBusiness] = useState<BusinessAccountDto | null>(null);
  const [viewPasswordDialogOpen, setViewPasswordDialogOpen] = useState(false);
  const [viewPasswordData, setViewPasswordData] = useState<{ username: string; tempPassword: string | null } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessAccountDto | null>(null);
  
  const { toast } = useToast();

  // Fetch business accounts
  const { data: businessAccounts = [] } = useQuery<BusinessAccountDto[]>({
    queryKey: ["/api/business-accounts"],
  });

  // Create business account mutation
  const createBusinessMutation = useMutation({
    mutationFn: async (data: { name: string; website: string; username: string }) => {
      return await apiRequest<{ businessAccount: BusinessAccountDto; user: any; credentials: { username: string; tempPassword: string } }>("POST", "/api/business-accounts", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-accounts"] });
      setNewBusinessName("");
      setNewBusinessWebsite("");
      setNewUsername("");
      setIsBusinessDialogOpen(false);
      setGeneratedCredentials(data.credentials);
      setCredentialsDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create business account",
        variant: "destructive",
      });
    },
  });

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBusinessName.trim() && newBusinessWebsite.trim() && newUsername.trim()) {
      createBusinessMutation.mutate({ 
        name: newBusinessName.trim(),
        website: newBusinessWebsite.trim(),
        username: newUsername.trim()
      });
    }
  };

  // Update business account mutation
  const updateBusinessMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; website: string }) => {
      return await apiRequest<BusinessAccountDto>("PUT", `/api/business-accounts/${data.id}`, {
        name: data.name,
        website: data.website,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-accounts"] });
      setIsEditDialogOpen(false);
      setEditingBusiness(null);
      toast({
        title: "Success",
        description: "Business account updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update business account",
        variant: "destructive",
      });
    },
  });

  const handleEditBusiness = (business: BusinessAccountDto) => {
    setEditingBusiness(business);
    setEditBusinessName(business.name);
    setEditBusinessWebsite(business.website || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBusiness && editBusinessName.trim() && editBusinessWebsite.trim()) {
      updateBusinessMutation.mutate({
        id: editingBusiness.id,
        name: editBusinessName.trim(),
        website: editBusinessWebsite.trim(),
      });
    }
  };

  // Toggle business account status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (data: { id: string; status: string }) => {
      return await apiRequest<BusinessAccountDto>("PATCH", `/api/business-accounts/${data.id}/status`, {
        status: data.status,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-accounts"] });
      toast({
        title: "Success",
        description: `Business account ${variables.status === "active" ? "activated" : "suspended"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update business account status",
        variant: "destructive",
      });
    },
  });

  const handleToggleStatus = (business: BusinessAccountDto) => {
    const newStatus = business.status === "active" ? "suspended" : "active";
    toggleStatusMutation.mutate({
      id: business.id,
      status: newStatus,
    });
  };

  // Toggle business account feature settings mutation
  const toggleFeaturesMutation = useMutation({
    mutationFn: async (data: { id: string; shopifyEnabled?: boolean; appointmentsEnabled?: boolean; voiceModeEnabled?: boolean }) => {
      return await apiRequest<BusinessAccountDto>("PATCH", `/api/business-accounts/${data.id}/features`, {
        shopifyEnabled: data.shopifyEnabled,
        appointmentsEnabled: data.appointmentsEnabled,
        voiceModeEnabled: data.voiceModeEnabled,
      });
    },
    onSuccess: (updatedBusiness) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Update selectedBusiness with fresh data from server response
      if (selectedBusiness && selectedBusiness.id === updatedBusiness.id) {
        setSelectedBusiness(updatedBusiness);
      }
      toast({
        title: "Success",
        description: "Feature settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update feature settings",
        variant: "destructive",
      });
    },
  });

  const handleToggleShopify = (business: BusinessAccountDto) => {
    const newValue = !business.shopifyEnabled;
    // Deep copy using structuredClone for complete isolation
    const previousState = selectedBusiness ? structuredClone(selectedBusiness) : null;
    
    // Optimistically update selectedBusiness using functional updater
    if (selectedBusiness && selectedBusiness.id === business.id) {
      setSelectedBusiness(prev => prev ? {...prev, shopifyEnabled: newValue} : prev);
    }
    toggleFeaturesMutation.mutate(
      {
        id: business.id,
        shopifyEnabled: newValue,
      },
      {
        onError: () => {
          // Rollback only if still on the same business (functional updater prevents cross-business contamination)
          setSelectedBusiness(prev => 
            (prev && prev.id === business.id && previousState) ? previousState : prev
          );
          queryClient.invalidateQueries({ queryKey: ["/api/business-accounts"] });
        }
      }
    );
  };

  const handleToggleAppointments = (business: BusinessAccountDto) => {
    const newValue = !business.appointmentsEnabled;
    // Deep copy using structuredClone for complete isolation
    const previousState = selectedBusiness ? structuredClone(selectedBusiness) : null;
    
    // Optimistically update selectedBusiness using functional updater
    if (selectedBusiness && selectedBusiness.id === business.id) {
      setSelectedBusiness(prev => prev ? {...prev, appointmentsEnabled: newValue} : prev);
    }
    toggleFeaturesMutation.mutate(
      {
        id: business.id,
        appointmentsEnabled: newValue,
      },
      {
        onError: () => {
          // Rollback only if still on the same business (functional updater prevents cross-business contamination)
          setSelectedBusiness(prev => 
            (prev && prev.id === business.id && previousState) ? previousState : prev
          );
          queryClient.invalidateQueries({ queryKey: ["/api/business-accounts"] });
        }
      }
    );
  };

  const handleToggleVoiceMode = (business: BusinessAccountDto) => {
    const newValue = !business.voiceModeEnabled;
    // Deep copy using structuredClone for complete isolation
    const previousState = selectedBusiness ? structuredClone(selectedBusiness) : null;
    
    // Optimistically update selectedBusiness using functional updater
    if (selectedBusiness && selectedBusiness.id === business.id) {
      setSelectedBusiness(prev => prev ? {...prev, voiceModeEnabled: newValue} : prev);
    }
    toggleFeaturesMutation.mutate(
      {
        id: business.id,
        voiceModeEnabled: newValue,
      },
      {
        onError: () => {
          // Rollback only if still on the same business (functional updater prevents cross-business contamination)
          setSelectedBusiness(prev => 
            (prev && prev.id === business.id && previousState) ? previousState : prev
          );
          queryClient.invalidateQueries({ queryKey: ["/api/business-accounts"] });
        }
      }
    );
  };

  // Reset password mutation (auto-generates new password)
  const resetPasswordMutation = useMutation({
    mutationFn: async (businessAccountId: string) => {
      return await apiRequest<{ username: string; tempPassword: string }>("POST", `/api/business-accounts/${businessAccountId}/reset-password`);
    },
    onSuccess: (data) => {
      setViewPasswordData(data);
      toast({
        title: "Password Reset Successfully",
        description: "A new temporary password has been generated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = () => {
    if (viewPasswordBusiness) {
      resetPasswordMutation.mutate(viewPasswordBusiness.id);
    }
  };

  // View password mutation
  const viewPasswordMutation = useMutation({
    mutationFn: async (businessAccountId: string) => {
      return await apiRequest<{ username: string; tempPassword: string | null }>("GET", `/api/business-accounts/${businessAccountId}/view-password`);
    },
    onSuccess: (data) => {
      setViewPasswordData(data);
      setViewPasswordDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to retrieve password",
        variant: "destructive",
      });
    },
  });

  const handleViewPassword = (business: BusinessAccountDto) => {
    setViewPasswordBusiness(business);
    setCopiedPassword(false);
    viewPasswordMutation.mutate(business.id);
  };

  const handleManageModules = (business: BusinessAccountDto) => {
    setSelectedBusiness(business);
    setModulesDialogOpen(true);
  };

  const handleCopyPassword = () => {
    if (viewPasswordData?.tempPassword) {
      navigator.clipboard.writeText(viewPasswordData.tempPassword);
      setCopiedPassword(true);
      toast({
        title: "Copied!",
        description: "Password copied to clipboard",
      });
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };


  return (
    <div className="flex flex-col flex-1 h-screen">
      {/* Header */}
      <header className="flex items-center justify-between h-[56px] px-6 bg-gradient-to-r from-red-500 via-purple-600 to-blue-600 shadow-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger data-testid="button-sidebar-toggle" className="text-white hover:bg-white/10 rounded-md" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-white leading-tight">AI Chroney</h1>
              <p className="text-[11px] text-white/90 leading-tight mt-0.5">Super Admin Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Business Accounts</h2>
              <p className="text-muted-foreground mt-1">
                Manage business accounts and their users
              </p>
            </div>
            <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-sm" data-testid="button-create-business">
                  <Plus className="w-4 h-4 mr-2" />
                  New Business Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Business Account</DialogTitle>
                  <DialogDescription>
                    Add a new business account with login credentials
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBusiness} className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      placeholder="e.g., Acme Corporation"
                      value={newBusinessName}
                      onChange={(e) => setNewBusinessName(e.target.value)}
                      required
                      data-testid="input-business-name"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessWebsite">Website URL</Label>
                    <Input
                      id="businessWebsite"
                      type="url"
                      placeholder="e.g., https://example.com"
                      value={newBusinessWebsite}
                      onChange={(e) => setNewBusinessWebsite(e.target.value)}
                      required
                      data-testid="input-business-website"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      This website will be used to train the AI chatbot
                    </p>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Login Credentials</h4>
                    <div>
                      <Label htmlFor="username">Username (Email)</Label>
                      <Input
                        id="username"
                        type="email"
                        placeholder="e.g., admin@acmecorp.com"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        data-testid="input-username"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        A secure temporary password will be auto-generated. User will be required to change it on first login.
                      </p>
                    </div>
                  </div>
                  <Button type="submit" disabled={createBusinessMutation.isPending} data-testid="button-submit-business" className="w-full">
                    {createBusinessMutation.isPending ? "Creating..." : "Create Business Account"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Business Account Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Business Account</DialogTitle>
                <DialogDescription>
                  Update the business account details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateBusiness} className="space-y-4">
                <div>
                  <Label htmlFor="editBusinessName">Business Name</Label>
                  <Input
                    id="editBusinessName"
                    placeholder="e.g., Acme Corporation"
                    value={editBusinessName}
                    onChange={(e) => setEditBusinessName(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="editBusinessWebsite">Website URL</Label>
                  <Input
                    id="editBusinessWebsite"
                    type="url"
                    placeholder="e.g., https://example.com"
                    value={editBusinessWebsite}
                    onChange={(e) => setEditBusinessWebsite(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    This website will be used to train the AI chatbot
                  </p>
                </div>
                <Button type="submit" disabled={updateBusinessMutation.isPending} className="w-full">
                  {updateBusinessMutation.isPending ? "Updating..." : "Update Business Account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Credentials Display Dialog */}
          <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Business Account Created Successfully!</DialogTitle>
                <DialogDescription>
                  Save these credentials securely. The user will need them to login.
                </DialogDescription>
              </DialogHeader>
              {generatedCredentials && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Username</label>
                        <div className="mt-1 p-2 bg-white border border-gray-300 rounded font-mono text-sm break-all">
                          {generatedCredentials.username}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Temporary Password</label>
                        <div className="mt-1 p-2 bg-white border border-gray-300 rounded font-mono text-sm break-all">
                          {generatedCredentials.tempPassword}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-blue-600 mt-0.5">ℹ️</div>
                    <p className="text-xs text-blue-800">
                      The user will be required to change this password on their first login for security.
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      setCredentialsDialogOpen(false);
                      setGeneratedCredentials(null);
                    }} 
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* View Password Dialog */}
          <Dialog open={viewPasswordDialogOpen} onOpenChange={setViewPasswordDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Credentials</DialogTitle>
                <DialogDescription>
                  View and manage login credentials for {viewPasswordBusiness?.name}
                </DialogDescription>
              </DialogHeader>
              {viewPasswordData && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Username</label>
                        <div className="mt-1 p-2 bg-white border border-gray-300 rounded font-mono text-sm break-all">
                          {viewPasswordData.username}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Temporary Password</label>
                        <div className="mt-1 flex gap-2">
                          <div className="flex-1 p-2 bg-white border border-gray-300 rounded font-mono text-sm break-all">
                            {viewPasswordData.tempPassword || "Password has been changed by user"}
                          </div>
                          {viewPasswordData.tempPassword && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCopyPassword}
                              className="px-3"
                            >
                              {copiedPassword ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {viewPasswordData.tempPassword && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-amber-600 mt-0.5">⚠️</div>
                      <p className="text-xs text-amber-800">
                        This is a temporary password. The user will be required to change it on first login.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleResetPassword}
                      disabled={resetPasswordMutation.isPending}
                      variant="outline"
                      className="flex-1"
                    >
                      {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                    </Button>
                    <Button 
                      onClick={() => {
                        setViewPasswordDialogOpen(false);
                        setViewPasswordData(null);
                        setViewPasswordBusiness(null);
                      }} 
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Manage Modules Dialog */}
          <Dialog open={modulesDialogOpen} onOpenChange={setModulesDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Manage Modules - {selectedBusiness?.name}
                </DialogTitle>
                <DialogDescription>
                  Enable or disable modules for this business account. Changes take effect immediately and will update the user's sidebar menu.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Shopify Module */}
                <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1">Shopify Integration</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Connect to Shopify stores, sync products automatically, and manage inventory through the Shopify tab.
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={selectedBusiness?.shopifyEnabled || false}
                        onCheckedChange={(checked) => {
                          if (selectedBusiness) {
                            handleToggleShopify(selectedBusiness);
                          }
                        }}
                        disabled={toggleFeaturesMutation.isPending}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedBusiness?.shopifyEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Appointments Module */}
                <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1">Appointment Booking</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      AI-powered appointment scheduling with weekly templates, slot overrides, and conversational booking through Chroney.
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={selectedBusiness?.appointmentsEnabled || false}
                        onCheckedChange={(checked) => {
                          if (selectedBusiness) {
                            handleToggleAppointments(selectedBusiness);
                          }
                        }}
                        disabled={toggleFeaturesMutation.isPending}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedBusiness?.appointmentsEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voice Mode Module */}
                <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Mic className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 mb-1">Voice Mode</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Real-time conversational voice mode with ChatGPT-style full-screen interface, animated orb, and zero-latency streaming responses.
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={selectedBusiness?.voiceModeEnabled || false}
                        onCheckedChange={(checked) => {
                          if (selectedBusiness) {
                            handleToggleVoiceMode(selectedBusiness);
                          }
                        }}
                        disabled={toggleFeaturesMutation.isPending}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedBusiness?.voiceModeEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setModulesDialogOpen(false);
                    setSelectedBusiness(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {businessAccounts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No business accounts yet</h3>
              <p className="text-sm text-gray-600">
                Create your first business account to get started
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold w-[180px]">Business Name</TableHead>
                    <TableHead className="font-semibold w-[200px]">Website</TableHead>
                    <TableHead className="font-semibold w-[140px]">Status</TableHead>
                    <TableHead className="font-semibold w-[100px]">Created</TableHead>
                    <TableHead className="font-semibold text-right w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businessAccounts.map((business) => {
                    const getDomain = (url: string) => {
                      try {
                        const domain = new URL(url).hostname;
                        return domain.replace('www.', '');
                      } catch {
                        return url;
                      }
                    };

                    return (
                      <TableRow key={business.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                            <span className="truncate">{business.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {business.website ? (
                            <a 
                              href={business.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:underline truncate block"
                              title={business.website}
                            >
                              {getDomain(business.website)}
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={business.status === "active"}
                              onCheckedChange={() => handleToggleStatus(business)}
                              disabled={toggleStatusMutation.isPending}
                            />
                            <Badge 
                              variant={business.status === "active" ? "default" : "secondary"}
                              className={business.status === "active" ? "bg-green-500" : "bg-gray-500"}
                            >
                              {business.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                          {new Date(business.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageModules(business)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-8"
                            >
                              <ShieldCheck className="h-4 w-4 sm:mr-1.5" />
                              <span className="hidden sm:inline">Modules</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditBusiness(business)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewPassword(business)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Password
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

