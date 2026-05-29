import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Shield, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier — Calm booking, made simple" },
      { name: "description", content: "A warm, modern slot booking system for studios, coaches and clinics." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-xl">Atelier</Link>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/register"><Button size="sm">Get started</Button></Link>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
              <Sparkles className="h-3 w-3" /> Booking, refined
            </div>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] md:text-6xl">
              A calmer way to book
              <span className="block italic text-primary">your time.</span>
            </h1>
            <p className="mt-5 max-w-md text-muted-foreground">
              Pick a slot, confirm in a tap, reschedule without friction. Built for studios,
              coaches and clinics that care about the details.
            </p>
            <div className="mt-8 flex gap-3">
              <Link to="/register"><Button size="lg">Create account</Button></Link>
              <Link to="/login"><Button size="lg" variant="outline">I already have one</Button></Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-elevated)]">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Tomorrow</p>
              <h3 className="mt-1 font-display text-2xl">Thu 14 · Available</h3>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {["09:00","09:30","10:00","10:30","11:00","11:30"].map((t,i)=>(
                  <div key={t} className={`rounded-xl border px-3 py-3 text-center text-sm ${i===2 ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40"}`}>{t}</div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-accent/30 px-4 py-3 text-sm text-accent-foreground">
                <strong>10:00</strong> · 30 min · with you
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {[
            { icon: Calendar, t: "Weekly calendar", d: "See the week, pick a slot, done." },
            { icon: Clock, t: "No double-booking", d: "Atomic locks keep slots honest." },
            { icon: Shield, t: "RBAC built-in", d: "Admin tools for staff, simple UI for guests." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-display text-xl">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <span>© Atelier</span>
          <span className="font-display italic">Make time feel kinder.</span>
        </div>
      </footer>
    </div>
  );
}
