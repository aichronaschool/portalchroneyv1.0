import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Package, HelpCircle, ShieldCheck, LogOut, Contact, Home, Building2, Sparkles, Settings, Brain, BarChart3, MessageSquare, ShoppingBag, Calendar, GraduationCap, ChevronRight, Presentation, FileText, Key, LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MeResponseDto } from "@shared/dto";

interface AppSidebarProps {
  user: MeResponseDto | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";
  
  // Feature flags from business account settings
  const hasShopifyEnabled = user?.businessAccount?.shopifyEnabled === true;
  const hasAppointmentsEnabled = user?.businessAccount?.appointmentsEnabled === true;

  // Fetch open ticket count for badge
  const { data: ticketStats } = useQuery<{ open: number }>({
    queryKey: ["/api/tickets/stats"],
    enabled: !isSuperAdmin && !!user,
  });
  
  const openTicketCount = ticketStats?.open || 0;

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      // Clear all query cache to prevent cross-tenant data leakage
      queryClient.clear();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">AI Chroney</h2>
            <p className="text-xs text-muted-foreground">{user?.username}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/")}
                    isActive={location === "/"}
                    data-testid="link-home"
                  >
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/insights")}
                    isActive={location === "/insights"}
                    data-testid="link-insights"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Insights</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/conversations")}
                    isActive={location === "/conversations"}
                    data-testid="link-conversations"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Conversations</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/admin/leads")}
                    isActive={location === "/admin/leads"}
                    data-testid="link-leads"
                  >
                    <Contact className="w-4 h-4" />
                    <span>Leads</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/tickets")}
                    isActive={location === "/tickets" || location.startsWith("/tickets/")}
                    data-testid="link-support-tickets"
                  >
                    <LifeBuoy className="w-4 h-4" />
                    <span>Support Tickets</span>
                    {openTicketCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs" data-testid="badge-ticket-count">
                        {openTicketCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSuperAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/super-admin")}
                    isActive={location === "/super-admin"}
                    data-testid="link-super-admin"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Business Accounts</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/super-admin/insights")}
                    isActive={location === "/super-admin/insights"}
                    data-testid="link-super-admin-insights"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Insights</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/super-admin/demo")}
                    isActive={location === "/super-admin/demo"}
                    data-testid="link-super-admin-demo"
                  >
                    <Presentation className="w-4 h-4" />
                    <span>Demo</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/super-admin/api-keys")}
                    isActive={location === "/super-admin/api-keys"}
                    data-testid="link-super-admin-api-keys"
                  >
                    <Key className="w-4 h-4" />
                    <span>API Keys</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/super-admin/settings")}
                    isActive={location === "/super-admin/settings"}
                    data-testid="link-super-admin-settings"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Training Collapsible Section */}
                <Collapsible
                  open={isTrainingOpen}
                  onOpenChange={setIsTrainingOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <GraduationCap className="w-4 h-4" />
                        <span>Training</span>
                        <ChevronRight className="ml-auto w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => setLocation("/train-chroney")}
                            isActive={location === "/train-chroney"}
                            data-testid="link-train-chroney"
                          >
                            <Brain className="w-4 h-4" />
                            <span>Train Chroney</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => setLocation("/admin/faqs")}
                            isActive={location === "/admin/faqs"}
                            data-testid="link-faqs"
                          >
                            <HelpCircle className="w-4 h-4" />
                            <span>FAQs</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => setLocation("/admin/about")}
                            isActive={location === "/admin/about"}
                            data-testid="link-about"
                          >
                            <Building2 className="w-4 h-4" />
                            <span>Website Scan</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => setLocation("/admin/scan-docs")}
                            isActive={location === "/admin/scan-docs"}
                            data-testid="link-scan-docs"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Scan Docs</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Other Menu Items */}
                {/* Show Products only when Shopify is NOT enabled */}
                {!hasShopifyEnabled && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setLocation("/admin/products")}
                      isActive={location === "/admin/products"}
                      data-testid="link-products"
                    >
                      <Package className="w-4 h-4" />
                      <span>Products</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {/* Show Shopify only when Shopify IS enabled */}
                {hasShopifyEnabled && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setLocation("/admin/shopify")}
                      isActive={location === "/admin/shopify"}
                      data-testid="link-shopify"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Shopify</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {/* Show Calendar only when Appointments IS enabled */}
                {hasAppointmentsEnabled && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setLocation("/admin/calendar")}
                      isActive={location === "/admin/calendar"}
                      data-testid="link-calendar"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Calendar</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/admin/widget-settings")}
                    isActive={location === "/admin/widget-settings"}
                    data-testid="link-widget-settings"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Widget</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          {!isSuperAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setLocation("/admin/settings")}
                isActive={location === "/admin/settings"}
                data-testid="link-settings"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
