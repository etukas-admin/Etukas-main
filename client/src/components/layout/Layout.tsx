import { Link, Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { PartnerHeader } from "./PartnerHeader";
import { BottomNav } from "./BottomNav";

export function Layout() {
  const location = useLocation();
  const isCategoriesPage = location.pathname === "/categories";
  const isPartnerPage =
    location.pathname === "/partner-hub" ||
    location.pathname === "/seller-hub" ||
    location.pathname === "/seller";

  return (
    <div className={`min-h-screen ${isPartnerPage ? "bg-slate-950 pb-0" : "bg-white pb-16 md:pb-0"}`}>
      {/* Dynamic Header: Dedicated PartnerHeader for Partner pages, default Header for Customer store */}
      {isCategoriesPage ? null : isPartnerPage ? <PartnerHeader /> : <Header />}

      {/* Page Content */}
      <Outlet />

      {/* Dynamic Footer: Dedicated Partner Footer on Partner pages, regular footer on Customer pages */}
      {isCategoriesPage ? null : isPartnerPage ? (
        <footer className="border-t border-slate-800 bg-slate-950 px-4 py-12 text-slate-400">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <img
                  src="/etukas-partner-logo.png"
                  alt="Etukas Partner"
                  className="h-10 w-auto object-contain brightness-110"
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Grow Your Business with India's dedicated construction & building materials partner network. Empowering sellers, technicians, manufacturers, and equipment owners.
              </p>
              <p className="mt-4 text-xs text-slate-500">© 2026 Etukas Partner Network. All rights reserved.</p>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Partner Categories</h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-400">
                <li>Material Sellers & Wholesalers</li>
                <li>Certified Technicians & Installers</li>
                <li>Direct Manufacturers & Mills</li>
                <li>Equipment & Machinery Owners</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Partner Resources</h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-400">
                <li><Link to="/partner-hub" className="hover:text-orange-400 transition-colors">Become an Etukas Partner</Link></li>
                <li><button onClick={() => window.dispatchEvent(new Event("open_partner_login"))} className="hover:text-orange-400 transition-colors text-left cursor-pointer">Partner Dashboard Login</button></li>
                <li><a href="tel:18001234567" className="hover:text-orange-400 transition-colors">Toll-free Partner Support</a></li>
                <li><Link to="/" className="hover:text-orange-400 transition-colors">Return to Etukas Marketplace</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Trust & Security</h3>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Bank-grade verification, transparent order disbursements, dedicated onboarding assistance, and 24/7 partner resolution desk.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-orange-400">
                <span>Direct Contact:</span>
                <span className="font-mono text-slate-200">partners@etukas.com</span>
              </div>
            </div>
          </div>
        </footer>
      ) : (
        <footer className="border-t border-gray-100 bg-etukas-black px-4 py-10 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
            <div>
              <div className="text-2xl font-extrabold text-white">Etukas.com</div>
              <p className="mt-3 text-sm text-gray-300">A local-first marketplace for trusted building materials, stores, and construction services.</p>
              <p className="mt-3 text-sm text-gray-300">© 2023 Etukas.com. All rights reserved.</p>
            </div>
            {["Company", "Help", "Policies"].map((title) => (
              <div key={title}>
                <h3 className="font-semibold">{title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-300">
                  <li>About Etukas</li>
                  <li>Contact support</li>
                  <li><Link to="/partner-hub" className="hover:text-white transition-colors">Etukas Partner Network</Link></li>
                </ul>
              </div>
            ))}
          </div>
        </footer>
      )}

      {/* Customer bottom navigation is shown only on customer pages */}
      {isPartnerPage ? null : <BottomNav />}
    </div>
  );
}
