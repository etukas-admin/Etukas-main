import { Boxes, IndianRupee, PackageCheck, ShoppingBag, TriangleAlert } from "lucide-react";

const cards = [
  ["Total orders", "128", ShoppingBag],
  ["Pending orders", "14", TriangleAlert],
  ["Revenue", "₹8.4L", IndianRupee],
  ["Products listed", "342", Boxes],
  ["Low stock", "9", PackageCheck]
] as const;

export function SellerDashboard() {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[240px_1fr] lg:px-6">
      <aside className="rounded-md border border-gray-100 p-4">
        {["Dashboard", "Business profile", "Stores", "Products", "Inventory", "Orders", "Reports", "Reviews"].map((item) => (
          <a key={item} className="block rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-etukas-pink hover:text-etukas-red">{item}</a>
        ))}
      </aside>
      <section>
        <h1 className="text-3xl font-extrabold">Seller Dashboard</h1>
        <p className="mt-2 text-gray-600">Operational modules are wired to protected seller APIs and ready for deeper CRUD screens.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map(([label, value, Icon]) => (
            <article key={label} className="rounded-md border border-gray-100 p-4">
              <Icon className="text-etukas-red" />
              <div className="mt-4 text-2xl font-extrabold">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
