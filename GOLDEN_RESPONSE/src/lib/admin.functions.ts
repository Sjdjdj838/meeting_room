import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const today = new Date().toISOString().slice(0, 10);
    const [{ count: totalBookings }, { count: cancellations }, { count: upcomingSlots }, { count: totalUsers }] =
      await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("slots").select("*", { count: "exact", head: true }).gte("date", today),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
    return {
      totalBookings: totalBookings ?? 0,
      cancellations: cancellations ?? 0,
      upcomingSlots: upcomingSlots ?? 0,
      totalUsers: totalUsers ?? 0,
    };
  });

export const adminListBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { page?: number; pageSize?: number }) =>
    z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, error, count } = await supabase
      .from("bookings")
      .select("*, slots(*), profiles(name,email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const adminCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookingId: string }) =>
    z.object({ bookingId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.bookingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCreateSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    date: string;
    times: { start: string; end: string }[];
    capacity?: number;
  }) =>
    z.object({
      date: z.string(),
      times: z.array(z.object({ start: z.string(), end: z.string() })).min(1).max(50),
      capacity: z.number().int().min(1).max(100).default(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const rows = data.times.map((t) => ({
      date: data.date,
      start_time: t.start,
      end_time: t.end,
      capacity: data.capacity ?? 1,
      is_disabled: false,
    }));
    const { error } = await supabase
      .from("slots")
      .upsert(rows, { onConflict: "date,start_time", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });

export const adminToggleSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slotId: string; disabled: boolean }) =>
    z.object({ slotId: z.string().uuid(), disabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("slots")
      .update({ is_disabled: data.disabled })
      .eq("id", data.slotId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slotId: string }) =>
    z.object({ slotId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("slots").delete().eq("id", data.slotId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
