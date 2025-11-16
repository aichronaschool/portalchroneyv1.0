import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, Key, DollarSign, Building2 } from "lucide-react";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
];

const apiKeySchema = z.object({
  openaiApiKey: z.string().optional(),
});

const currencySchema = z.object({
  currency: z.string().min(3, "Currency code must be 3 letters"),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;
type CurrencyFormData = z.infer<typeof currencySchema>;

interface BusinessAccount {
  id: string;
  name: string;
  website: string | null;
}

interface ApiSettings {
  businessAccountId: string;
  businessName: string;
  openaiApiKey: string | null;
  hasOpenAIKey: boolean;
  currency: string;
}

export default function SuperAdminApiKeys() {
  const { toast } = useToast();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  const { data: businessAccounts = [] } = useQuery<BusinessAccount[]>({
    queryKey: ["/api/business-accounts"],
  });

  const { data: apiSettings, isLoading: apiSettingsLoading } = useQuery<ApiSettings>({
    queryKey: ["/api/business-accounts", selectedBusinessId, "api-settings"],
    enabled: !!selectedBusinessId,
  });

  const openAIKeyForm = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      openaiApiKey: "",
    },
  });

  const currencyForm = useForm<CurrencyFormData>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      currency: "USD",
    },
  });

  useEffect(() => {
    if (apiSettings) {
      currencyForm.reset({ currency: apiSettings.currency || "USD" });
      openAIKeyForm.reset({ openaiApiKey: "" });
    }
  }, [apiSettings]);


  const updateOpenAIKeyMutation = useMutation({
    mutationFn: async (data: ApiKeyFormData) => {
      const payload: Partial<ApiKeyFormData> = {};
      if (data.openaiApiKey && data.openaiApiKey.trim()) {
        payload.openaiApiKey = data.openaiApiKey.trim();
      }
      if (Object.keys(payload).length === 0) {
        throw new Error("Please enter an API key to update");
      }
      return apiRequest("PATCH", `/api/business-accounts/${selectedBusinessId}/api-settings`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OpenAI API key updated successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/business-accounts", selectedBusinessId, "api-settings"] 
      });
      openAIKeyForm.reset({ openaiApiKey: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update OpenAI API key",
        variant: "destructive",
      });
    },
  });


  const updateCurrencyMutation = useMutation({
    mutationFn: async (data: CurrencyFormData) => {
      return apiRequest("PATCH", `/api/business-accounts/${selectedBusinessId}/api-settings`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Currency updated successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/business-accounts", selectedBusinessId, "api-settings"] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update currency",
        variant: "destructive",
      });
    },
  });

  const handleOpenAIKeySubmit = openAIKeyForm.handleSubmit((data) => {
    if (!selectedBusinessId) {
      toast({
        title: "Error",
        description: "Please select a business account first",
        variant: "destructive",
      });
      return;
    }
    updateOpenAIKeyMutation.mutate(data);
  });


  const handleCurrencySubmit = currencyForm.handleSubmit((data) => {
    if (!selectedBusinessId) {
      toast({
        title: "Error",
        description: "Please select a business account first",
        variant: "destructive",
      });
      return;
    }
    updateCurrencyMutation.mutate(data);
  });

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">API Keys & Settings</h1>
        <p className="text-muted-foreground">
          Manage OpenAI API keys and currency settings for business accounts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Select Business Account
          </CardTitle>
          <CardDescription>
            Choose a business account to configure its API settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
            <SelectTrigger data-testid="select-business-account">
              <SelectValue placeholder="Select a business account..." />
            </SelectTrigger>
            <SelectContent>
              {businessAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.website || "No website"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBusinessId && !apiSettingsLoading && apiSettings && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                OpenAI API Key
              </CardTitle>
              <CardDescription>
                Configure the OpenAI API key for this business account's chatbot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiSettings?.hasOpenAIKey && (
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <p className="text-sm font-medium">Current API Key</p>
                  <p className="text-sm font-mono text-muted-foreground">
                    {apiSettings.openaiApiKey}
                  </p>
                </div>
              )}

              <form onSubmit={handleOpenAIKeySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openaiApiKey">
                    {apiSettings?.hasOpenAIKey ? "New API Key (leave blank to keep existing)" : "API Key"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="openaiApiKey"
                      type={showOpenAIKey ? "text" : "password"}
                      placeholder="sk-..."
                      data-testid="input-openai-api-key"
                      {...openAIKeyForm.register("openaiApiKey")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                      data-testid="button-toggle-openai-key-visibility"
                    >
                      {showOpenAIKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {openAIKeyForm.formState.errors.openaiApiKey && (
                    <p className="text-sm text-destructive">
                      {openAIKeyForm.formState.errors.openaiApiKey.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={updateOpenAIKeyMutation.isPending || apiSettingsLoading}
                  data-testid="button-save-openai-key"
                >
                  {updateOpenAIKeyMutation.isPending ? "Saving..." : apiSettingsLoading ? "Loading..." : "Save API Key"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Currency Settings
              </CardTitle>
              <CardDescription>
                Configure the display currency for products and pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCurrencySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={currencyForm.watch("currency")}
                    onValueChange={(value) => currencyForm.setValue("currency", value)}
                  >
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currencyForm.formState.errors.currency && (
                    <p className="text-sm text-destructive">
                      {currencyForm.formState.errors.currency.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={updateCurrencyMutation.isPending || apiSettingsLoading}
                  data-testid="button-save-currency"
                >
                  {updateCurrencyMutation.isPending ? "Saving..." : apiSettingsLoading ? "Loading..." : "Save Currency"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {selectedBusinessId && apiSettingsLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedBusinessId && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              Please select a business account to manage its API settings
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
