import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  adminCancelBooking,
  adminCreateSlots,
  adminDeleteSlot,
  adminListBookings,
  adminStats,
  adminToggleSlot,
} from "@/lib/admin.functions";
import { listSlotsByDateRange, getMyRole } from "@/lib/booking.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Users, CalendarDays, X, BookOpenCheck } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — Atelier" }] }),
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: AdminPage,
});

function AdminPage() {
  const fetchRole = useServerFn(getMyRole);
  const role = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  if (role.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!role.data?.isAdmin) return <div className="p-10 font-display text-2xl">403 — Admins only.</div>;

  return (
    <div className="p-6 md:p-10">
      <PageHeader title="Admin" subtitle="Run the studio." />
      <StatsSection />
      <Tabs defaultValue="bookings" className="mt-10">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="slots">Slots</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings" className="mt-6"><BookingsTable /></TabsContent>
        <TabsContent value="slots" className="mt-6"><SlotsManager /></TabsContent>
      </Tabs>
    </div>
  );
}

function StatsSection() {
  const fn = useServerFn(adminStats);
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn() });
  const items = [
    { icon: BookOpenCheck, label: "Confirmed bookings", value: data?.totalBookings ?? 0 },
    { icon: X, label: "Cancellations", value: data?.cancellations ?? 0 },
    { icon: CalendarDays, label: "Upcoming slots", value: data?.upcomingSlots ?? 0 },
    { icon: Users, label: "Users", value: data?.totalUsers ?? 0 },
  ];
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value }) => (
        <Card key={label} className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="font-display text-3xl">{value}</p>
          </div>
          <div className="rounded-xl bg-accent/40 p-3 text-accent-foreground"><Icon className="h-5 w-5" /></div>
        </Card>
      ))}
    </div>
  );
}

function BookingsTable() {
  const qc = useQueryClient();
  const fn = useServerFn(adminListBookings);
  const cancelFn = useServerFn(adminCancelBooking);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings", page],
    queryFn: () => fn({ data: { page, pageSize } }),
  });
  const cancelM = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { bookingId: id } }),
    onSuccess: () => {
      toast.success("Cancelled");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
            ) : (data?.rows ?? []).length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No bookings yet.</td></tr>
            ) : (
              (data?.rows ?? []).map((b: any) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.profiles?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.profiles?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {b.slots ? `${format(parseISO(b.slots.date), "d MMM")} · ${b.slots.start_time.slice(0,5)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={b.status === "confirmed" ? "default" : "outline"}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "confirmed" && (
                      <Button size="sm" variant="ghost" onClick={() => cancelM.mutate(b.id)} disabled={cancelM.isPending}>
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <span className="text-muted-foreground">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </Card>
  );
}

function SlotsManager() {
  const qc = useQueryClient();
  const fetchSlots = useServerFn(listSlotsByDateRange);
  const createFn = useServerFn(adminCreateSlots);
  const toggleFn = useServerFn(adminToggleSlot);
  const deleteFn = useServerFn(adminDeleteSlot);
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [step, setStep] = useState(30);
  const [capacity, setCapacity] = useState(1);

  const slots = useQuery({
    queryKey: ["admin-slots", today, in30],
    queryFn: () => fetchSlots({ data: { from: today, to: in30 } }),
  });

  const createM = useMutation({
    mutationFn: () => {
      const times: { start: string; end: string }[] = [];
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      let cur = sh * 60 + sm;
      const stop = eh * 60 + em;
      while (cur + step <= stop) {
        const next = cur + step;
        const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        times.push({ start: fmt(cur), end: fmt(next) });
        cur = next;
      }
      return createFn({ data: { date, times, capacity } });
    },
    onSuccess: (r) => {
      toast.success(`${r.created} slot(s) ready`);
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: (p: { slotId: string; disabled: boolean }) => toggleFn({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-slots"] }),
  });
  const delM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { slotId: id } }),
    onSuccess: () => {
      toast.success("Slot deleted");
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <Card className="space-y-3 p-5">
        <h3 className="font-display text-lg">Generate slots</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Start</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>End</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <div><Label>Step (min)</Label><Input type="number" value={step} min={5} max={240} onChange={(e) => setStep(parseInt(e.target.value || "30"))} /></div>
          <div><Label>Capacity</Label><Input type="number" value={capacity} min={1} max={100} onChange={(e) => setCapacity(parseInt(e.target.value || "1"))} /></div>
        </div>
        <Button onClick={() => createM.mutate()} disabled={createM.isPending} className="w-full">
          {createM.isPending ? "Creating…" : "Create slots"}
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-lg">Next 30 days</h3>
        <div className="mt-4 max-h-[28rem] overflow-y-auto">
          {(slots.data ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No slots yet.</p>
          ) : (
            <div className="space-y-1">
              {(slots.data ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary">
                  <div className="text-sm">
                    {format(parseISO(s.date), "EEE d MMM")} · <strong>{s.start_time.slice(0,5)}</strong>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {s.booked_count}/{s.capacity} · {s.is_disabled ? "disabled" : "active"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleM.mutate({ slotId: s.id, disabled: !s.is_disabled })}>
                      {s.is_disabled ? "Enable" : "Disable"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => delM.mutate(s.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
