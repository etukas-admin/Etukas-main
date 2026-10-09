import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function Layout() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />
      <Outlet />
      <footer className="border-t border-gray-100 bg-etukas-black px-4 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <div className="text-2xl font-extrabold text-white">Etukas.com</div>
            <p className="mt-3 text-sm text-gray-300">A local-first marketplace for trusted building materials, stores, and construction services.</p>
          </div>
          {["Company", "Help", "Policies"].map((title) => (
            <div key={title}>
              <h3 className="font-semibold">{title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li>About Etukas</li>
                <li>Contact support</li>
                <li>Seller onboarding</li>
              </ul>
            </div>
          ))}
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
