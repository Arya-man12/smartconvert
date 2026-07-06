import { Link, useLocation } from "wouter";
import {
  ArrowLeftRight,
  FileArchive,
  Gauge,
  History,
  Settings,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Convert", url: "/", icon: ArrowLeftRight, testId: "convert" },
  { title: "Compress", url: "/compress", icon: FileArchive, testId: "compress" },
  { title: "Benchmark", url: "/benchmark", icon: Gauge, testId: "benchmark" },
  { title: "History", url: "/history", icon: History, testId: "history" },
  { title: "Settings", url: "/settings", icon: Settings, testId: "settings" },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold leading-tight text-sidebar-foreground">
              SmartConvert
            </div>
            <div className="text-xs text-sidebar-foreground/60">
              Convert & compress
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.testId}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
