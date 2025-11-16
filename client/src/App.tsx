import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import AdminProducts from "@/pages/AdminProducts";
import AdminFaqs from "@/pages/AdminFaqs";
import AdminLeads from "@/pages/AdminLeads";
import About from "@/pages/About";
import WidgetSettings from "@/pages/WidgetSettings";
import Settings from "@/pages/Settings";
import TrainChroney from "@/pages/TrainChroney";
import Training from "@/pages/Training";
import Insights from "@/pages/Insights";
import Conversations from "@/pages/Conversations";
import Calendar from "@/pages/Calendar";
import SuperAdmin from "@/pages/SuperAdmin";
import SuperAdminSettings from "@/pages/SuperAdminSettings";
import SuperAdminInsights from "@/pages/SuperAdminInsights";
import SuperAdminDemo from "@/pages/SuperAdminDemo";
import SuperAdminApiKeys from "@/pages/SuperAdminApiKeys";
import PublicDemo from "@/pages/PublicDemo";
import PublicChat from "@/pages/PublicChat";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import ResetPassword from "@/pages/ResetPassword";
import Home from "@/pages/Home";
import EmbedChat from "@/pages/EmbedChat";
import ImportExcel from "@/pages/ImportExcel";
import Shopify from "@/pages/Shopify";
import ScanDocs from "@/pages/ScanDocs";
import NotFound from "@/pages/not-found";
import type { MeResponseDto } from "@shared/dto";

function AppContent({ currentUser }: { currentUser: MeResponseDto | null }) {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<MeResponseDto | null>(currentUser);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      // Check if password change is required or password is expired
      const isPasswordExpired = currentUser.tempPasswordExpiry && new Date(currentUser.tempPasswordExpiry) < new Date();
      if (currentUser.mustChangePassword === "true" || isPasswordExpired) {
        setLocation("/change-password");
      }
    }
  }, [currentUser, setLocation]);

  const handleLogin = (loggedInUser: MeResponseDto) => {
    setUser(loggedInUser);
  };

  // Public routes (no authentication required)
  if (location.startsWith("/reset-password")) {
    return <ResetPassword />;
  }

  if (location.startsWith("/embed/chat")) {
    return <EmbedChat />;
  }

  if (location.startsWith("/demo/")) {
    return <PublicDemo />;
  }

  if (location.startsWith("/public-chat/")) {
    return <PublicChat />;
  }

  // Show login page if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Show change password page if required
  if (location === "/change-password") {
    return <ChangePassword />;
  }

  // Authenticated routes
  return (
    <>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 lg:hidden sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">AI Chroney</h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <Switch>
            {user?.role === "super_admin" ? (
              <>
                <Route path="/">
                  <Redirect to="/super-admin" />
                </Route>
                <Route path="/super-admin" component={SuperAdmin} />
                <Route path="/admin/insights" component={SuperAdminInsights} />
                <Route path="/super-admin/insights" component={SuperAdminInsights} />
                <Route path="/super-admin/demo" component={SuperAdminDemo} />
                <Route path="/super-admin/api-keys" component={SuperAdminApiKeys} />
                <Route path="/super-admin/settings" component={SuperAdminSettings} />
              </>
            ) : (
              <>
                <Route path="/" component={Home} />
                <Route path="/insights" component={Insights} />
                <Route path="/conversations" component={Conversations} />
                <Route path="/admin/training" component={Training} />
                <Route path="/train-chroney" component={TrainChroney} />
                <Route path="/admin/products" component={AdminProducts} />
                <Route path="/products/import-excel" component={ImportExcel} />
                <Route path="/admin/shopify" component={Shopify} />
                <Route path="/admin/faqs" component={AdminFaqs} />
                <Route path="/admin/leads" component={AdminLeads} />
                <Route path="/admin/calendar" component={Calendar} />
                <Route path="/admin/about" component={About} />
                <Route path="/admin/scan-docs" component={ScanDocs} />
                <Route path="/admin/widget-settings" component={WidgetSettings} />
                <Route path="/admin/settings" component={Settings} />
              </>
            )}
            <Route component={NotFound} />
          </Switch>
        </div>
      </SidebarInset>
    </>
  );
}

function AppWithProviders() {
  const [location] = useLocation();
  const style = {
    "--sidebar-width": "13rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  // Skip auth check for public routes
  const isPublicRoute = location.startsWith("/embed/chat") || location.startsWith("/reset-password") || location.startsWith("/public-chat/");

  // Check authentication status ONCE (skip for public routes)
  const { data: currentUser, isLoading: authLoading } = useQuery<MeResponseDto>({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !isPublicRoute,
  });

  // Render public routes immediately without auth check
  if (isPublicRoute) {
    if (location.startsWith("/embed/chat")) {
      return <EmbedChat />;
    }
    if (location.startsWith("/reset-password")) {
      return <ResetPassword />;
    }
  }

  // Show centered loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider style={style} defaultOpen={true}>
        <AppContent currentUser={currentUser || null} />
        <Toaster />
      </SidebarProvider>
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWithProviders />
    </QueryClientProvider>
  );
}

export default App;
