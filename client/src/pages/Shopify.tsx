import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Save,
  InfoIcon,
  Package,
  Clock,
  Settings2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WidgetSettings {
  id: string;
  businessAccountId: string;
  currency: string;
}

interface AutoSyncSettings {
  autoSyncEnabled: boolean;
  syncFrequency: string;
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed';
  lastSyncError: string | null;
}

interface SyncNowResponse {
  message: string;
  imported: number;
  updated: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  AED: "د.إ",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "¥",
  JPY: "¥",
  KRW: "₩",
  SGD: "S$",
  HKD: "HK$",
  NZD: "NZ$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  BRL: "R$",
  MXN: "$",
  ZAR: "R",
  TRY: "₺",
  RUB: "₽",
};

export default function Shopify() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Shopify credentials state
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState("");
  const [shopifyAccessToken, setShopifyAccessToken] = useState("");
  const [shopifyError, setShopifyError] = useState("");
  const [shopifySaveStatus, setShopifySaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Auto-sync state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState<number>(24);
  const [autoSyncSaveStatus, setAutoSyncSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Fetch all products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter Shopify products
  const shopifyProducts = products.filter(p => p.source === 'shopify');

  // Fetch widget settings for currency
  const { data: widgetSettings } = useQuery<WidgetSettings>({
    queryKey: ["/api/widget-settings"],
  });

  // Fetch auto-sync settings
  const { data: autoSyncSettings } = useQuery<AutoSyncSettings>({
    queryKey: ["/api/shopify/auto-sync"],
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.syncStatus === 'syncing' ? 5000 : false;
    },
  });

  // Fetch Shopify credentials
  const { data: shopifyData } = useQuery<{ storeUrl: string | null; hasToken: boolean; maskedToken: string | null }>({
    queryKey: ["/api/settings/shopify"],
  });

  useEffect(() => {
    if (shopifyData) {
      setShopifyStoreUrl(shopifyData.storeUrl || "");
      if (shopifyData.maskedToken) {
        setShopifyAccessToken(shopifyData.maskedToken);
      }
    }
  }, [shopifyData]);

  useEffect(() => {
    if (autoSyncSettings) {
      setAutoSyncEnabled(autoSyncSettings.autoSyncEnabled);
      setSyncFrequency(parseInt(autoSyncSettings.syncFrequency) || 24);
    }
  }, [autoSyncSettings]);

  const currencySymbol = widgetSettings ? CURRENCY_SYMBOLS[widgetSettings.currency] || "$" : "$";
  const syncStatus = autoSyncSettings?.syncStatus || 'idle';
  const isSyncing = syncStatus === 'syncing';
  const lastSyncedAt = autoSyncSettings?.lastSyncedAt;

  // Sync Now mutation
  const syncNowMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<SyncNowResponse>("POST", "/api/shopify/sync-now");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/shopify/auto-sync"] });
      const previousSettings = queryClient.getQueryData(["/api/shopify/auto-sync"]);
      queryClient.setQueryData(["/api/shopify/auto-sync"], (old: AutoSyncSettings | undefined) => {
        if (!old) return old;
        return { ...old, syncStatus: 'syncing' as const };
      });
      return { previousSettings };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopify/auto-sync"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Products synced successfully!",
        description: `${data.imported} new, ${data.updated} updated`,
      });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["/api/shopify/auto-sync"], context.previousSettings);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to sync products",
        variant: "destructive",
      });
    },
  });

  // Update Shopify credentials mutation
  const updateShopifyMutation = useMutation({
    mutationFn: async (data: { storeUrl: string; accessToken: string }) => {
      const response = await fetch("/api/settings/shopify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update Shopify settings");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/shopify"] });
      setShopifySaveStatus("saved");
      if (data.maskedToken) {
        setShopifyAccessToken(data.maskedToken);
      }
      setShopifyError("");
      setTimeout(() => setShopifySaveStatus("idle"), 2000);
      toast({
        title: "Success",
        description: "Shopify credentials saved successfully",
      });
    },
    onError: (error: any) => {
      setShopifyError(error.message || "Failed to save Shopify credentials");
      setShopifySaveStatus("idle");
    },
  });

  // Update auto-sync mutation
  const updateAutoSyncMutation = useMutation({
    mutationFn: async (data: { enabled: boolean; frequency: number }) => {
      const response = await fetch("/api/shopify/auto-sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update auto-sync settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopify/auto-sync"] });
      setAutoSyncSaveStatus("saved");
      setTimeout(() => setAutoSyncSaveStatus("idle"), 2000);
      toast({
        title: "Success",
        description: "Auto-sync settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save auto-sync settings",
        variant: "destructive",
      });
      setAutoSyncSaveStatus("idle");
    },
  });

  const handleShopifySave = () => {
    setShopifyError("");

    if (!shopifyStoreUrl && !shopifyAccessToken) {
      setShopifySaveStatus("saving");
      updateShopifyMutation.mutate({ storeUrl: "", accessToken: "" });
      return;
    }

    if (!shopifyStoreUrl || !shopifyAccessToken) {
      setShopifyError("Both store URL and access token are required");
      return;
    }

    setShopifySaveStatus("saving");
    updateShopifyMutation.mutate({
      storeUrl: shopifyStoreUrl,
      accessToken: shopifyAccessToken,
    });
  };

  const handleAutoSyncSave = () => {
    setAutoSyncSaveStatus("saving");
    updateAutoSyncMutation.mutate({
      enabled: autoSyncEnabled,
      frequency: syncFrequency,
    });
  };

  const handleSyncNow = () => {
    if (isSyncing) {
      toast({
        title: "A sync is already in progress",
        variant: "default",
      });
      return;
    }
    syncNowMutation.mutate();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-purple-600" />
          Shopify Integration
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your Shopify store integration, products, and sync settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-purple-50 to-white backdrop-blur-sm shadow-md h-auto p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-200 data-[state=active]:to-blue-100 data-[state=active]:text-purple-900 data-[state=active]:font-semibold">
            <Package className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-200 data-[state=active]:to-blue-100 data-[state=active]:text-purple-900 data-[state=active]:font-semibold">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-200 data-[state=active]:to-blue-100 data-[state=active]:text-purple-900 data-[state=active]:font-semibold">
            <Settings2 className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Sync Status Card */}
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-600" />
                Sync Status
              </CardTitle>
              <CardDescription>Current synchronization status with your Shopify store</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {syncStatus === 'idle' && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      Ready
                    </Badge>
                  )}
                  {syncStatus === 'syncing' && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Syncing...
                    </Badge>
                  )}
                  {syncStatus === 'completed' && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <Check className="w-3 h-3 mr-1" />
                      Synced
                    </Badge>
                  )}
                  {syncStatus === 'failed' && (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}

                  {lastSyncedAt && (
                    <span className="text-sm text-muted-foreground">
                      Last synced: {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <Button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  variant="default"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Shopify Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{shopifyProducts.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Synced from Shopify
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Auto-Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {autoSyncEnabled ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatic synchronization
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sync Frequency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {syncFrequency}h
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Hours between syncs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Benefits Alert */}
          <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
            <InfoIcon className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-sm text-purple-900 dark:text-purple-100">
              <strong>Shopify Integration Benefits:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Automatically sync products from your Shopify store</li>
                <li>Keep product information up-to-date with scheduled syncing</li>
                <li>Chroney can answer customer questions about your Shopify products</li>
                <li>No manual product entry required</li>
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-6">
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-purple-600" />
                    Shopify Products
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Products synced from your Shopify store (read-only)
                  </CardDescription>
                </div>
                <Badge variant="secondary">{shopifyProducts.length} products</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-muted-foreground">Loading products...</span>
                </div>
              ) : shopifyProducts.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Shopify Products</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    No products have been synced from Shopify yet.
                  </p>
                  <Button onClick={handleSyncNow} disabled={isSyncing}>
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Products
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[120px]">Price</TableHead>
                        <TableHead className="w-[150px]">Last Synced</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shopifyProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                <Package className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            {product.price ? `${currencySymbol}${product.price}` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {product.updatedAt
                              ? formatDistanceToNow(new Date(product.updatedAt), {
                                  addSuffix: true,
                                })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Read-only
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          {/* Shopify Credentials Card */}
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-purple-600" />
                    Shopify Store Credentials
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Configure your Shopify store connection
                  </CardDescription>
                </div>
                {shopifySaveStatus === "saving" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Save className="w-4 h-4 animate-pulse" />
                    <span>Saving...</span>
                  </div>
                )}
                {shopifySaveStatus === "saved" && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    <span>Saved</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                <InfoIcon className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Setup Instructions:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Log in to your Shopify admin panel</li>
                    <li>Go to Settings → Apps and sales channels → Develop apps</li>
                    <li>Create a new app or select an existing one</li>
                    <li>Configure API scopes: read_products, read_inventory</li>
                    <li>Install the app and copy the Admin API access token</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="storeUrl" className="text-sm font-medium">
                    Store URL
                  </Label>
                  <Input
                    id="storeUrl"
                    type="text"
                    value={shopifyStoreUrl}
                    onChange={(e) => setShopifyStoreUrl(e.target.value)}
                    placeholder="your-store.myshopify.com"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your Shopify store URL (without https://)
                  </p>
                </div>

                <div>
                  <Label htmlFor="accessToken" className="text-sm font-medium">
                    Admin API Access Token
                  </Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={shopifyAccessToken}
                    onChange={(e) => setShopifyAccessToken(e.target.value)}
                    placeholder="shpat_..."
                    className="mt-2"
                  />
                  {shopifyError && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>{shopifyError}</span>
                    </div>
                  )}
                  {!shopifyError && shopifyData?.hasToken && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Access token configured
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Get your access token from Shopify Admin API
                  </p>
                </div>

                <Button
                  onClick={handleShopifySave}
                  disabled={shopifySaveStatus === "saving"}
                  className="w-full"
                >
                  {shopifySaveStatus === "saving" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Credentials
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Sync Settings Card */}
          <Card className="shadow-lg border-gray-200">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-600" />
                    Auto-Sync Configuration
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Configure automatic product synchronization
                  </CardDescription>
                </div>
                {autoSyncSaveStatus === "saving" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Save className="w-4 h-4 animate-pulse" />
                    <span>Saving...</span>
                  </div>
                )}
                {autoSyncSaveStatus === "saved" && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    <span>Saved</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoSync" className="text-sm font-medium">
                      Enable Auto-Sync
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically sync products at regular intervals
                    </p>
                  </div>
                  <Switch
                    id="autoSync"
                    checked={autoSyncEnabled}
                    onCheckedChange={setAutoSyncEnabled}
                  />
                </div>

                <div>
                  <Label htmlFor="syncFrequency" className="text-sm font-medium">
                    Sync Frequency
                  </Label>
                  <Select
                    value={syncFrequency.toString()}
                    onValueChange={(value) => setSyncFrequency(parseInt(value))}
                    disabled={!autoSyncEnabled}
                  >
                    <SelectTrigger id="syncFrequency" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every hour</SelectItem>
                      <SelectItem value="6">Every 6 hours</SelectItem>
                      <SelectItem value="12">Every 12 hours</SelectItem>
                      <SelectItem value="24">Every 24 hours</SelectItem>
                      <SelectItem value="168">Every week</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    How often to sync products from Shopify
                  </p>
                </div>

                {lastSyncedAt && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Sync:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Status:</span>
                      {syncStatus === 'completed' && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <Check className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {syncStatus === 'failed' && (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      {syncStatus === 'syncing' && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          In Progress
                        </Badge>
                      )}
                      {syncStatus === 'idle' && (
                        <Badge variant="secondary">Idle</Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAutoSyncSave}
                  disabled={autoSyncSaveStatus === "saving"}
                  className="w-full"
                >
                  {autoSyncSaveStatus === "saving" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Auto-Sync Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
