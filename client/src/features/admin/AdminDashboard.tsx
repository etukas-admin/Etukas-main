export function AdminDashboard() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
      <p className="mt-2 text-gray-600">Protected admin APIs enforce ADMIN authorization server-side.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {["Marketplace overview", "Seller applications", "Product moderation", "Audit logs"].map((item) => (
          <article key={item} className="rounded-md border border-gray-100 p-5 font-semibold">{item}</article>
        ))}
      </div>
    </main>
  );
}
