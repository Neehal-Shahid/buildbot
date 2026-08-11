// Temporary placeholder — replaced page-by-page as the migration proceeds
// (see the migration plan). Keeps routing/build working end-to-end while
// index.html / dashboard.html / admin.html are ported one at a time.
export default function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
      <p className="text-sm">{name} — not yet migrated.</p>
    </div>
  );
}
