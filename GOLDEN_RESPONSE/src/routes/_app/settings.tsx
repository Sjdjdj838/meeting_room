import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Atelier" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };
  return (
    <div className="p-6 md:p-10">
      <PageHeader title="Settings" subtitle="Manage your session." />
      <Card className="mt-8 max-w-xl space-y-4 p-6">
        <div>
          <h3 className="font-display text-lg">Session</h3>
          <p className="text-sm text-muted-foreground">Sign out of this device.</p>
        </div>
        <Button variant="outline" onClick={signOut}>Sign out</Button>
      </Card>
    </div>
  );
}
