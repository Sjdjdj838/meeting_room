export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header>
      <h1 className="font-display text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
