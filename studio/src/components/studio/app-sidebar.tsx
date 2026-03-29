"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Table2,
  Terminal,
  Shield,
  FileCode2,
  Settings,
  ScrollText,
  Database,
  LogOut,
  LayoutDashboard,
  Mail,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

// ---------------------------------------------------------------------------
// Navigation items: global vs project-scoped
// ---------------------------------------------------------------------------

const GLOBAL_NAV = [
  { title: "Projects", href: "/", icon: Home },
] as const;

const PROJECT_NAV = [
  { title: "Overview", href: "", icon: LayoutDashboard },
] as const;

const TOOL_NAV = [
  { title: "Table Editor", href: "/tables", icon: Table2 },
  { title: "SQL Editor", href: "/sql", icon: Terminal },
  { title: "Auth", href: "/auth", icon: Shield },
  { title: "Email Templates", href: "/auth/templates", icon: Mail },
  { title: "API Docs", href: "/api-docs", icon: FileCode2 },
  { title: "Logs", href: "/logs", icon: ScrollText },
] as const;

const SETTINGS_NAV = [
  { title: "Settings", href: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  // Detect if we're inside a project context
  const projectMatch = pathname.match(/^\/project\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;
  const projectBase = projectId ? `/project/${projectId}` : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link href="/" className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
            <Database className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            LiteBase Studio
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Global nav */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {GLOBAL_NAV.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <item.icon
                        className={isActive ? "text-[#00ff88]" : ""}
                      />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Project-scoped nav — only visible when a project is selected */}
        {projectBase && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Project</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {PROJECT_NAV.map((item) => {
                    const href = `${projectBase}${item.href}`;
                    const isActive = pathname === href;
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.title}
                          render={<Link href={href} />}
                        >
                          <item.icon
                            className={isActive ? "text-[#00ff88]" : ""}
                          />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Tools</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {TOOL_NAV.map((item) => {
                    const href = `${projectBase}${item.href}`;
                    const isActive = pathname.startsWith(href);
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.title}
                          render={<Link href={href} />}
                        >
                          <item.icon
                            className={isActive ? "text-[#00ff88]" : ""}
                          />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Configuration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {SETTINGS_NAV.map((item) => {
                    const href = `${projectBase}${item.href}`;
                    const isActive = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.title}
                          render={<Link href={href} />}
                        >
                          <item.icon
                            className={isActive ? "text-[#00ff88]" : ""}
                          />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* When no project selected, show the general tools */}
        {!projectBase && (
          <SidebarGroup>
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {TOOL_NAV.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                      >
                        <item.icon
                          className={isActive ? "text-[#00ff88]" : ""}
                        />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/settings")}
                    tooltip="Settings"
                    render={<Link href="/settings" />}
                  >
                    <Settings
                      className={
                        pathname.startsWith("/settings") ? "text-[#00ff88]" : ""
                      }
                    />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <form action="/api/auth/logout" method="POST">
              <SidebarMenuButton
                tooltip="Sign out"
                render={<button type="submit" className="w-full" />}
              >
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
