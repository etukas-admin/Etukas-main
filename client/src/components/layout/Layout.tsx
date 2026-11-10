import { Link, Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { PartnerHeader } from "./PartnerHeader";
import { BottomNav } from "./BottomNav";
import { UserChatWidget } from "../chat/UserChatWidget";

export function Layout() {
  const location = useLocation();
  const isCategoriesPage = location.pathname === "/categories";
  const isHomePage = location.pathname === "/";
  const isCheckoutPage = location.pathname === "/checkout";
  const isOrderPage = location.pathname.startsWith("/order-confirmed");
  const isPartnerPage =
    location.pathname === "/partner-hub" ||
    location.pathname === "/seller-hub" ||
    location.pathname === "/partner-dashboard" ||
    location.pathname === "/seller";

  return (
    <div className={`min-h-screen ${isPartnerPage ? "bg-slate-950 pb-0" : isCheckoutPage || isOrderPage ? "bg-white pb-0 md:pb-0" : "bg-white pb-16 md:pb-0"}`}>
      {/* Dynamic Header: Dedicated PartnerHeader for Partner pages, default Header for Customer store */}
      {isCategoriesPage ? null : isPartnerPage ? <PartnerHeader /> : <Header />}

      {/* Page Content */}
      <Outlet />

      {/* Dynamic Footer: Dedicated Partner Footer on Partner pages, regular footer on Homepage only */}
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
              <p className="mt-4 text-xs text-slate-500">Â© 2026 Etukas Partner Network. All rights reserved.</p>
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
      ) : isHomePage ? (
        <footer className="border-t border-gray-100 bg-etukas-black px-4 py-6 text-white md:py-8">
          <div className="mx-auto max-w-7xl rounded-[18px] border border-white/10 bg-[#0b0b0b] px-4 py-6 sm:px-5 md:px-7 md:py-7 lg:px-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-normal text-white md:text-3xl">Etukas</h2>
              <p className="mt-2 text-base text-slate-300 md:text-lg">Online marketplace for building materials.</p>
            </div>

            <div className="border-t border-white/10" />

            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 md:grid-cols-4 md:gap-x-8 lg:gap-x-12">
              <section>
                <h3 className="text-base font-bold leading-tight text-white sm:text-lg md:text-xl">Customer Support</h3>
                <ul className="mt-3 space-y-2 text-xs leading-snug text-slate-300 sm:text-sm md:text-base">
                  <li><Link to="/customer" className="transition-colors hover:text-white">Contact Us</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">Help Center</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">FAQs</Link></li>
                  <li><Link to="/orders" className="transition-colors hover:text-white">Track Your Order</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">Raise a Complaint</Link></li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-bold leading-tight text-white sm:text-lg md:text-xl">Legal &amp; Policies</h3>
                <ul className="mt-3 space-y-2 text-xs leading-snug text-slate-300 sm:text-sm md:text-base">
                  <li><Link to="/customer" className="transition-colors hover:text-white">Terms &amp; Conditions</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">Privacy Policy</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">Shipping Policy</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">Cancellation Policy</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">Return &amp; Refund Policy</Link></li>
                  <li><Link to="/partner-hub" className="transition-colors hover:text-white">Seller Terms &amp; Conditions</Link></li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-bold leading-tight text-white sm:text-lg md:text-xl">About Etukas</h3>
                <ul className="mt-3 space-y-2 text-xs leading-snug text-slate-300 sm:text-sm md:text-base">
                  <li><Link to="/" className="transition-colors hover:text-white">About Us</Link></li>
                  <li><Link to="/partner-hub" className="transition-colors hover:text-white">Become a Seller</Link></li>
                  <li><Link to="/" className="transition-colors hover:text-white">Careers</Link></li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-bold leading-tight text-white sm:text-lg md:text-xl">Important Information</h3>
                <ul className="mt-3 space-y-2 text-xs leading-snug text-slate-300 sm:text-sm md:text-base">
                  <li><Link to="/customer" className="transition-colors hover:text-white">Grievance Redressal</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">Product Warranty Policy</Link></li>
                  <li><Link to="/customer" className="transition-colors hover:text-white">Payment &amp; Tax Information</Link></li>
                </ul>
              </section>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-center">
              <p className="text-xs text-slate-300 sm:text-sm md:text-base">&copy; 2026 Etukas. All rights reserved.</p>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm md:text-base">Privacy · Terms · Refunds</p>
            </div>
          </div>
        </footer>
      ) : null}

      {/* Customer bottom navigation is shown only on customer pages (not on checkout or order pages) */}
      {isPartnerPage || isCheckoutPage || isOrderPage ? null : <BottomNav />}

      {/* Floating Chat Widget for direct User/Partner with Admin interaction */}
      <UserChatWidget />
    </div>
  );
}
