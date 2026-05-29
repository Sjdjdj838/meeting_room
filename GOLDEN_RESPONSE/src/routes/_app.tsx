import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/booking.functions";
import { Calendar, LayoutDashboard, Settings as SettingsIcon, ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchRole = useServerFn(getMyRole);
  const { data: role } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });

  const items = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/slots", label: "Book a slot", icon: Calendar },
    { to: "/profile", label: "Profile", icon: UserIcon },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="px-6 py-6">
          <Link to="/" className="font-display text-xl text-sidebar-foreground">Atelier</Link>
        </div>
        <nav className="flex-1 px-3">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
          {role?.isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
              )}
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
