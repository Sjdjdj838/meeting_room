import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { bookSlot, listSlotsByDateRange } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

const search = z.object({ date: z.string().optional() });

export const Route = createFileRoute("/_app/slots")({
  head: () => ({ meta: [{ title: "Book a slot — Atelier" }] }),
  validateSearch: (s) => search.parse(s),
  component: SlotsPage,
});

function SlotsPage() {
  const qc = useQueryClient();
  const sp = Route.useSearch();
  const fetchSlots = useServerFn(listSlotsByDateRange);
  const bookFn = useServerFn(bookSlot);

  const initialDate = sp.date ? parseISO(sp.date) : new Date();
  const [anchor, setAnchor] = useState(() => startOfWeek(initialDate, { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<string>(format(initialDate, "yyyy-MM-dd"));
  const [picked, setPicked] = useState<any | null>(null);
  const [notes, setNotes] = useState("");

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor],
  );
  const from = format(anchor, "yyyy-MM-dd");
  const to = format(addDays(anchor, 6), "yyyy-MM-dd");

  const slots = useQuery({
    queryKey: ["slots", from, to],
    queryFn: () => fetchSlots({ data: { from, to } }),
  });

  const daySlots = (slots.data ?? []).filter((s: any) => s.date === selectedDate);

  const bookM = useMutation({
    mutationFn: (input: { slotId: string; notes?: string }) => bookFn({ data: input }),
    onSuccess: () => {
      toast.success("Booking confirmed");
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      setPicked(null);
      setNotes("");
    },
    onError: (e: Error) => {
      toast.error(e.message.includes("no longer available") ? "This slot is no longer available" : e.message);
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });

  return (
    <div className="p-6 md:p-10">
      <PageHeader title="Pick a time" subtitle="Browse the week, choose what works." />

      {/* Week strip */}
      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setAnchor(addDays(anchor, -7))}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <p className="font-display text-xl">
          {format(anchor, "MMM d")} – {format(addDays(anchor, 6), "MMM d, yyyy")}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setAnchor(addDays(anchor, 7))}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {weekDays.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const count = (slots.data ?? []).filter((s: any) => s.date === key && s.available).length;
          const active = key === selectedDate;
          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className={cn(
                "rounded-2xl border p-3 text-left transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
              )}
            >
              <p className="text-[10px] uppercase tracking-widest opacity-70">{format(d, "EEE")}</p>
              <p className="font-display text-2xl">{format(d, "d")}</p>
              <p className="mt-1 text-[11px] opacity-80">{count} open</p>
            </button>
          );
        })}
      </div>

      {/* Slots grid */}
      <div className="mt-10">
        <h2 className="font-display text-xl">{format(parseISO(selectedDate), "EEEE, d MMMM")}</h2>
        {slots.isLoading ? (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : daySlots.length === 0 ? (
          <Card className="mt-4 p-10 text-center text-sm text-muted-foreground">
            No slots on this day yet.
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {daySlots.map((s: any) => {
              const disabled = !s.available;
              return (
                <button
                  key={s.id}
                  disabled={disabled}
                  onClick={() => setPicked(s)}
                  className={cn(
                    "rounded-xl border px-3 py-4 text-center text-sm transition-colors",
                    disabled
                      ? "cursor-not-allowed border-dashed bg-muted text-muted-foreground line-through"
                      : "bg-card hover:border-primary hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  {s.start_time.slice(0, 5)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Confirm booking</DialogTitle>
            <DialogDescription>
              {picked && (
                <>{format(parseISO(picked.date), "EEEE, d MMMM")} at <strong>{picked.start_time?.slice(0,5)}</strong> – {picked.end_time?.slice(0,5)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Anything we should know?"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)}>Cancel</Button>
            <Button
              onClick={() => picked && bookM.mutate({ slotId: picked.id, notes: notes || undefined })}
              disabled={bookM.isPending}
            >
              {bookM.isPending ? "Booking…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
