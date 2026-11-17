export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-brand/30 bg-brand/5 px-3 py-2.5 text-sm text-brand">
      {message}
    </p>
  );
}
