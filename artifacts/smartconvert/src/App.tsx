import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import ConvertPage from "@/pages/convert";
import CompressPage from "@/pages/compress";
import BenchmarkPage from "@/pages/benchmark";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={ConvertPage} />
      <Route path="/compress" component={CompressPage} />
      <Route path="/benchmark" component={BenchmarkPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <Separator orientation="vertical" className="h-5" />
          <span className="font-serif text-sm font-semibold">SmartConvert</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Router />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="smartconvert-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppLayout />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
