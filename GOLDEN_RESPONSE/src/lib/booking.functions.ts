import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------- Slots ---------- */

export const listSlotsByDateRange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) =>
    z.object({ from: z.string(), to: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: slots, error } = await supabase
      .from("slots")
      .select("*")
      .gte("date", data.from)
      .lte("date", data.to)
      .order("date")
      .order("start_time");
    if (error) throw new Error(error.message);

    const ids = (slots ?? []).map((s) => s.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: bks } = await supabase
        .from("bookings")
        .select("slot_id")
        .in("slot_id", ids)
        .eq("status", "confirmed");
      counts = (bks ?? []).reduce<Record<string, number>>((acc, b) => {
        acc[b.slot_id] = (acc[b.slot_id] ?? 0) + 1;
        return acc;
      }, {});
    }
    return (slots ?? []).map((s) => ({
      ...s,
      booked_count: counts[s.id] ?? 0,
      available: !s.is_disabled && (counts[s.id] ?? 0) < s.capacity,
    }));
  });

/* ---------- Bookings ---------- */

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("*, slots(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const bookSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slotId: string; notes?: string }) =>
    z.object({ slotId: z.string().uuid(), notes: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("book_slot", {
      _slot_id: data.slotId,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return res;
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookingId: string }) =>
    z.object({ bookingId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.bookingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookingId: string; newSlotId: string }) =>
    z.object({ bookingId: z.string().uuid(), newSlotId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Cancel old, then atomically book new
    const { error: cancelErr } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.bookingId);
    if (cancelErr) throw new Error(cancelErr.message);
    const { data: res, error } = await supabase.rpc("book_slot", {
      _slot_id: data.newSlotId,
      _notes: undefined,
    });
    if (error) throw new Error(error.message);
    return res;
  });

/* ---------- Role ---------- */

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role);
    return { roles, isAdmin: roles.includes("admin") };
  });
