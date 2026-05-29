import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, Clock, X } from "lucide-react";
import { cancelBooking, listMyBookings, listSlotsByDateRange } from "@/lib/booking.functions";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Atelier" }] }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const fetchBookings = useServerFn(listMyBookings);
  const fetchSlots = useServerFn(listSlotsByDateRange);
  const cancelFn = useServerFn(cancelBooking);

  const today = new Date();
  const in14 = new Date(today.getTime() + 14 * 86400_000);

  const bookings = useQuery({ queryKey: ["my-bookings"], queryFn: () => fetchBookings() });
  const slots = useQuery({
    queryKey: ["slots", today.toISOString().slice(0, 10)],
    queryFn: () => fetchSlots({ data: { from: today.toISOString().slice(0, 10), to: in14.toISOString().slice(0, 10) } }),
  });

  const cancelM = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { bookingId: id } }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upcoming = (bookings.data ?? [])
    .filter((b: any) => b.status === "confirmed")
    .slice(0, 5);
  const nextSlots = (slots.data ?? []).filter((s: any) => s.available).slice(0, 9);

  return (
    <div className="p-6 md:p-10">
      <PageHeader title="Your studio" subtitle="A quick look at what's coming up." />

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <StatCard icon={Calendar} label="Upcoming" value={upcoming.length} />
        <StatCard icon={CheckCircle2} label="All-time confirmed" value={(bookings.data ?? []).filter((b: any) => b.status === "confirmed").length} />
        <StatCard icon={X} label="Cancelled" value={(bookings.data ?? []).filter((b: any) => b.status === "cancelled").length} />
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">Available this fortnight</h2>
            <p className="text-sm text-muted-foreground">Tap any time to confirm in one step.</p>
          </div>
          <Link to="/slots"><Button variant="outline">Open calendar</Button></Link>
        </div>
        {slots.isLoading ? (
          <SkeletonGrid />
        ) : nextSlots.length === 0 ? (
          <EmptyState text="No open slots right now. Check back soon." />
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nextSlots.map((s: any) => (
              <Card key={s.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{format(parseISO(s.date), "EEE d MMM")}</p>
                  <p className="font-display text-xl">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</p>
                </div>
                <Link to="/slots" search={{ date: s.date }}>
                  <Button size="sm">Book</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Upcoming bookings</h2>
        {bookings.isLoading ? (
          <SkeletonGrid />
        ) : upcoming.length === 0 ? (
          <EmptyState text="No upcoming bookings yet." />
        ) : (
          <div className="mt-5 space-y-3">
            {upcoming.map((b: any) => (
              <Card key={b.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-secondary p-3 text-secondary-foreground">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-lg">{format(parseISO(b.slots.date), "EEE d MMM")} · {b.slots.start_time.slice(0,5)}</p>
                    <p className="text-xs text-muted-foreground">{b.notes ?? "No notes"}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelM.mutate(b.id)}
                  disabled={cancelM.isPending}
                >
                  Cancel
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="flex items-center justify-between p-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-display text-3xl">{value}</p>
      </div>
      <div className="rounded-xl bg-accent/40 p-3 text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="mt-5 p-10 text-center text-sm text-muted-foreground">{text}</Card>
  );
}
