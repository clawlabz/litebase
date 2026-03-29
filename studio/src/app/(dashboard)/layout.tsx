import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/studio/app-sidebar";
import { Header } from "@/components/studio/header";
import { getSessionRole } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = getSessionRole(cookieStore);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {role === "viewer" && (
          <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900">
            You are viewing as a demo user. Read-only access.{" "}
            <a
              href="https://github.com/clawlabz/litebase"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:text-amber-700"
            >
              Get your own instance
            </a>
          </div>
        )}
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
