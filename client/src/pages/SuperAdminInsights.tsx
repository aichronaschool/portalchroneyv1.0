import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Building2, Users, MessageSquare, Contact, Package, FileQuestion, Clock, TrendingUp, Sparkles, LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  iconColor: string;
}

function StatCard({ icon: Icon, label, value, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-xs md:text-sm font-medium text-gray-600">
          <div className="flex items-center gap-2 h-5">
            <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
            <span className="truncate leading-tight">{label}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

interface BusinessUser {
  id: string;
  username: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface BusinessAnalytics {
  id: string;
  name: string;
  website: string;
  status: string;
  createdAt: string;
  userCount: number;
  lastLogin: string | null;
  users: BusinessUser[];
  leadCount: number;
  conversationCount: number;
  productCount: number;
  faqCount: number;
}

interface BusinessAccount {
  id: string;
  name: string;
  website: string;
}

export default function SuperAdminInsights() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("all");

  // Fetch all business accounts for the dropdown
  const { data: businessAccounts = [] } = useQuery<BusinessAccount[]>({
    queryKey: ["/api/business-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/business-accounts", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch business accounts");
      }
      return response.json();
    },
  });

  // Fetch analytics for selected business (or all)
  const { data: analytics = [], isLoading, isError, error, refetch } = useQuery<BusinessAnalytics[]>({
    queryKey: ["/api/super-admin/insights", selectedBusinessId],
    queryFn: async () => {
      const url = selectedBusinessId === "all" 
        ? "/api/super-admin/insights"
        : `/api/super-admin/insights?businessAccountId=${selectedBusinessId}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch business analytics");
      }
      return response.json();
    },
  });

  // Calculate totals
  const totals = analytics.reduce(
    (acc, business) => ({
      businesses: acc.businesses + 1,
      users: acc.users + business.userCount,
      leads: acc.leads + business.leadCount,
      conversations: acc.conversations + business.conversationCount,
      products: acc.products + business.productCount,
      faqs: acc.faqs + business.faqCount,
    }),
    { businesses: 0, users: 0, leads: 0, conversations: 0, products: 0, faqs: 0 }
  );

  // Stats configuration (removed Users since it's 1:1 with Businesses)
  const statsConfig: StatCardProps[] = [
    { icon: Building2, label: "Businesses", value: totals.businesses, iconColor: "text-blue-600" },
    { icon: Contact, label: "Leads", value: totals.leads, iconColor: "text-green-600" },
    { icon: MessageSquare, label: "Conversations", value: totals.conversations, iconColor: "text-orange-600" },
    { icon: Package, label: "Products", value: totals.products, iconColor: "text-cyan-600" },
    { icon: FileQuestion, label: "FAQs", value: totals.faqs, iconColor: "text-indigo-600" },
  ];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const getLoginStatus = (lastLogin: string | null) => {
    if (!lastLogin) return "text-gray-400";
    const now = new Date().getTime();
    const loginTime = new Date(lastLogin).getTime();
    const hoursSince = (now - loginTime) / (1000 * 60 * 60);
    
    if (hoursSince < 24) return "text-green-600";
    if (hoursSince < 168) return "text-yellow-600";
    return "text-red-600";
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
              <p className="text-[11px] text-white/90 leading-tight mt-0.5">Super Admin Insights</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {/* Page Title */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Business Insights</h2>
                </div>
                <p className="text-muted-foreground mt-1">
                  Analytics and activity overview for business accounts
                </p>
              </div>
              
              {/* Business Selector */}
              <div className="w-full lg:w-80">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Business Account
                </label>
                <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a business" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Businesses</SelectItem>
                    {businessAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Error State */}
          {isError && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-1">Failed to Load Analytics</h3>
                    <p className="text-sm text-red-700 mb-4">
                      {error instanceof Error ? error.message : "Unable to fetch business analytics data"}
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-16 mb-6">
              <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-medium text-gray-900 mb-2">Loading Business Analytics</p>
              <p className="text-sm text-gray-600">Gathering data from all business accounts...</p>
            </div>
          )}

          {/* Summary Cards */}
          {!isLoading && !isError && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
              {statsConfig.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>
          )}

          {/* No Business Accounts State */}
          {!isLoading && !isError && analytics.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No business accounts found</p>
              </CardContent>
            </Card>
          )}

          {/* Business Analytics Cards */}
          {!isLoading && !isError && analytics.length > 0 && (
            <div className="space-y-6">
              {analytics.map((business) => (
                <Card key={business.id} className="border-l-4 border-l-purple-600">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-purple-600" />
                            {business.name}
                          </CardTitle>
                          <Badge 
                            variant={business.status === "active" ? "default" : "secondary"}
                            className={business.status === "active" ? "bg-green-500" : "bg-gray-500"}
                          >
                            {business.status}
                          </Badge>
                        </div>
                        <a 
                          href={business.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-1 inline-block break-all"
                        >
                          {business.website}
                        </a>
                        <p className="text-xs text-gray-500 mt-2">
                          Created {formatDate(business.createdAt)}
                        </p>
                      </div>
                      <div className="md:text-right">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className={`w-4 h-4 ${getLoginStatus(business.lastLogin)}`} />
                          <span className="text-gray-600">Last Activity:</span>
                        </div>
                        <p className={`text-sm font-medium ${getLoginStatus(business.lastLogin)} mt-1`}>
                          {formatDate(business.lastLogin)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <Contact className="w-4 h-4" />
                          <span className="text-xs font-medium">Leads</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">{business.leadCount}</div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-xs font-medium">Conversations</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-900">{business.conversationCount}</div>
                      </div>

                      <div className="bg-cyan-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-cyan-600 mb-1">
                          <Package className="w-4 h-4" />
                          <span className="text-xs font-medium">Products</span>
                        </div>
                        <div className="text-2xl font-bold text-cyan-900">{business.productCount}</div>
                      </div>

                      <div className="bg-indigo-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                          <FileQuestion className="w-4 h-4" />
                          <span className="text-xs font-medium">FAQs</span>
                        </div>
                        <div className="text-2xl font-bold text-indigo-900">{business.faqCount}</div>
                      </div>
                    </div>

                    {/* User Information (1:1 relationship) */}
                    {business.users.length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-purple-600" />
                              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Account User</p>
                            </div>
                            <p className="font-medium text-gray-900 truncate">{business.users[0].username}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Joined {formatDate(business.users[0].createdAt)}
                            </p>
                          </div>
                          <div className="sm:text-right flex-shrink-0">
                            <p className="text-xs text-gray-600">Last Login</p>
                            <p className={`text-sm font-medium ${getLoginStatus(business.users[0].lastLoginAt)}`}>
                              {formatDate(business.users[0].lastLoginAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
