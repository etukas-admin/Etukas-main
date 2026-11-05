import { Link, Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { PartnerHeader } from "./PartnerHeader";
import { BottomNav } from "./BottomNav";
import { UserChatWidget } from "../chat/UserChatWidget";

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
      ) : (
        <footer className="bg-[#090909] px-4 py-8 text-white md:px-8">
          <div className="mx-auto max-w-[1200px] rounded-[28px] border border-white/10 bg-[#0a0a0a] px-5 py-8 md:px-8 lg:px-10">
            <div className="mb-8">
              <h2 className="text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">Etukas</h2>
              <p className="mt-5 text-lg text-slate-300 md:text-2xl">
                Building materials, delivered to your doorstep.
              </p>
            </div>

            <div className="border-t border-white/10" />

            <div className="mt-8 grid gap-10 md:grid-cols-2">
              <div className="space-y-10">
                <section>
                  <h3 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">Customer Support</h3>
                  <ul className="mt-5 space-y-3 text-lg text-slate-300 md:text-[1.6rem] md:leading-relaxed">
                    <li>Contact Us</li>
                    <li>Help Center</li>
                    <li>FAQs</li>
                    <li>Track Your Order</li>
                    <li>Raise a Complaint</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">About Etukas</h3>
                  <ul className="mt-5 space-y-3 text-lg text-slate-300 md:text-[1.6rem] md:leading-relaxed">
                    <li>About Us</li>
                    <li>Become a Seller</li>
                    <li>Careers</li>
                  </ul>
                </section>
              </div>

              <div className="space-y-10">
                <section>
                  <h3 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">Legal &amp; Policies</h3>
                  <ul className="mt-5 space-y-3 text-lg text-slate-300 md:text-[1.6rem] md:leading-relaxed">
                    <li>Terms &amp; Conditions</li>
                    <li>Privacy Policy</li>
                    <li>Shipping Policy</li>
                    <li>Cancellation Policy</li>
                    <li>Return &amp; Refund Policy</li>
                    <li>Seller Terms &amp; Conditions</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">Important Information</h3>
                  <ul className="mt-5 space-y-3 text-lg text-slate-300 md:text-[1.6rem] md:leading-relaxed">
                    <li>Grievance Redressal</li>
                    <li>Product Warranty Policy</li>
                    <li>Payment &amp; Tax Information</li>
                  </ul>
                </section>
              </div>
            </div>

            <div className="mt-10 border-t border-white/10 pt-8 text-center">
              <p className="text-lg text-slate-300 md:text-2xl">&copy; 2026 Etukas. All rights reserved.</p>
              <p className="mt-2 text-lg text-slate-300 md:text-2xl">Privacy · Terms · Refunds</p>
            </div>
          </div>
        </footer>
      )}

      {/* Customer bottom navigation is shown only on customer pages */}
      {isPartnerPage ? null : <BottomNav />}

      {/* Floating Chat Widget for direct User/Partner with Admin interaction */}
      <UserChatWidget />
    </div>
  );
}
