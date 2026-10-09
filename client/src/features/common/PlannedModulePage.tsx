export function PlannedModulePage({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-sm font-bold uppercase text-etukas-red">Functional extension</p>
      <h1 className="mt-2 text-3xl font-extrabold">{title}</h1>
      <p className="mt-4 text-gray-600">This module has reserved routes, database design space, and navigation. The MVP prioritizes materials, stores, cart, checkout, orders, seller tools, and admin approval.</p>
    </main>
  );
}
