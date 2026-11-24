import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { PartnerHeader } from "./PartnerHeader";
import { BottomNav } from "./BottomNav";
import { UserChatWidget } from "../chat/UserChatWidget";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";
import { isPartnerUser } from "../../lib/authRoles";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());

  useEffect(() => {
    const handleAuthChange = () => setCurrentUser(getStoredUser());
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
  }, []);

  const signedInPartner = isPartnerUser(currentUser);

  // Keep authenticated Sellers / Partners strictly inside the Partner Dashboard.
  // To browse or buy on the Customer Marketplace, partners must sign out and use customer credentials.
  if (signedInPartner && location.pathname !== "/partner-dashboard") {
    return <Navigate to="/partner-dashboard" replace />;
  }

  const handleSwitchToCustomerMarketplace = async () => {
    await marketplaceApi.logout();
    navigate("/login");
  };
  const isCategoriesPage = location.pathname === "/categories";
  const isHomePage = location.pathname === "/";
  const isCheckoutPage = location.pathname === "/checkout";
  const isOrderPage = location.pathname.startsWith("/order-confirmed");
  const isAccountHubPage =
    location.pathname === "/customer" || location.pathname === "/account";
  const isAccountSubPage =
    location.pathname === "/orders" ||
    location.pathname.startsWith("/account/");
  const isPartnerPage =
    location.pathname === "/partner-hub" ||
    location.pathname === "/seller-hub" ||
    location.pathname === "/partner-dashboard" ||
    location.pathname === "/seller";

  return (
    <div
      className={`min-h-screen ${
        isPartnerPage
          ? "bg-slate-950 pb-0"
          : isCheckoutPage || isOrderPage || isAccountSubPage
          ? "bg-white pb-0 md:pb-0"
          : "bg-white pb-16 md:pb-0"
      }`}
    >
      {/* Dynamic Header: Dedicated PartnerHeader for Partner pages, desktop-only Header on mobile Account views */}
      {isCategoriesPage ? null : isPartnerPage ? (
        <PartnerHeader />
      ) : isAccountHubPage || isAccountSubPage ? (
        <div className="hidden md:block">
          <Header />
        </div>
      ) : (
        <Header />
      )}

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
                {signedInPartner ? (
                  <>
                    <li><Link to="/partner-dashboard" className="hover:text-orange-400 transition-colors">Partner Dashboard</Link></li>
                    <li><a href="mailto:partners@etukas.com" className="hover:text-orange-400 transition-colors">Partner Support Desk</a></li>
                    <li>
                      <button
                        type="button"
                        onClick={() => void handleSwitchToCustomerMarketplace()}
                        className="hover:text-orange-400 transition-colors text-left cursor-pointer"
                      >
                        Sign Out to Visit Customer Marketplace
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li><Link to="/partner-hub" className="hover:text-orange-400 transition-colors">Become an Etukas Partner</Link></li>
                    <li><button type="button" onClick={() => window.dispatchEvent(new Event("open_partner_login"))} className="hover:text-orange-400 transition-colors text-left cursor-pointer">Partner Dashboard Login</button></li>
                    <li><a href="mailto:partners@etukas.com" className="hover:text-orange-400 transition-colors">Partner Support Desk</a></li>
                    <li><Link to="/" className="hover:text-orange-400 transition-colors">Return to Etukas Marketplace</Link></li>
                  </>
                )}
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
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-300">Follow Us On</h3>
              <nav aria-label="Social media" className="mt-3 flex justify-center gap-3">
                {[
                  { name: "YouTube", href: "https://www.youtube.com/@Etukas", Icon: Youtube },
                  { name: "Instagram", href: "https://www.instagram.com/etukas_com/", Icon: Instagram },
                  { name: "Facebook", href: "https://www.facebook.com/etukasgroup/", Icon: Facebook },
                  { name: "X", href: "https://x.com/etukas_com", Icon: null },
                  { name: "LinkedIn", href: "https://www.linkedin.com/in/etukas-b64022210/", Icon: Linkedin },
                  { name: "Pinterest", href: "https://in.pinterest.com/etukascom/", Icon: null },
                ].map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    title={name}
                    className="rounded-full border border-white/15 p-2 text-slate-300 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {Icon ? (
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    ) : name === "Pinterest" ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 4.917 2.96 9.142 7.19 10.99-.034-.938-.006-2.064.234-3.085l1.73-7.33s-.43-.86-.43-2.13c0-1.995 1.156-3.486 2.594-3.486 1.223 0 1.813.919 1.813 2.02 0 1.23-.784 3.07-1.187 4.775-.338 1.426.717 2.59 2.123 2.59 2.548 0 4.264-3.273 4.264-7.153 0-2.948-1.985-5.154-5.596-5.154-4.08 0-6.62 3.044-6.62 6.443 0 1.173.346 2 .887 2.64.249.294.284.412.194.75l-.265 1.08c-.088.347-.362.471-.667.343-1.86-.76-2.727-2.8-2.727-5.09 0-3.785 3.19-8.32 9.516-8.32 5.083 0 8.426 3.68 8.426 7.63 0 5.224-2.904 9.13-7.184 9.13-1.438 0-2.79-.778-3.254-1.662l-.93 3.7c-.28 1.06-.828 2.12-1.33 2.946.993.293 2.042.451 3.13.451 6.627 0 12-5.373 12-12S18.627 0 12 0Z" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.83L0 1.153h7.594l5.243 6.932zm-1.29 19.8h2.04L6.49 3.28H4.3z" />
                      </svg>
                    )}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </footer>
      ) : null}

      {/* Customer bottom navigation is shown only on customer pages (not on checkout, order, or account subpages) */}
      {isPartnerPage || isCheckoutPage || isOrderPage || isAccountSubPage ? null : <BottomNav />}

      {/* Floating Chat Widget for direct User/Partner with Admin interaction */}
      <UserChatWidget />
    </div>
  );
}
