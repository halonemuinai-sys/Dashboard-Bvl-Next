export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-zinc-500">This module is currently under development.</p>
      </div>
    </div>
  );
}
