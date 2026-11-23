import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Headphones, LogIn, UserPlus, UserRound } from "lucide-react";
import { queryKeys } from "../../../lib/queryKeys";
import { getStoredUser, marketplaceApi, type OrderRecord, type User } from "../../../services/api";
import { ADDRESS_CHANGE_EVENT, getDeliveryAddresses } from "../../location/locationStore";
import { AccountFooterSection, AccountHeader } from "../components/AccountHeaderFooter";
import { AccountModals } from "../components/AccountModals";
import { AccountQuickActions } from "../components/AccountQuickActions";
import { AccountSettingsMenu, type AccountModalType } from "../components/AccountSettingsMenu";
import { CouponsOffersSection } from "../components/CouponsOffersSection";
import { LatestOrderReviewSection, OrderReviewModal } from "../components/OrderReviewModal";
import { RecentlyViewedSection } from "../components/RecentlyViewedSection";
import { SponsoredSection } from "../components/SponsoredSection";
import { useAccountPreferences } from "../store/accountPreferencesStore";
import { useWishlist } from "../store/wishlistStore";

export function MyAccountPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [savedAddressesCount, setSavedAddressesCount] = useState<number>(() => getDeliveryAddresses().length);
  const [activeModal, setActiveModal] = useState<AccountModalType | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Review modal state triggered directly from Latest Order Review card
  const [reviewTarget, setReviewTarget] = useState<{ order: OrderRecord; initialRating?: number } | null>(null);

  const { count: wishlistCount } = useWishlist();
  const { preferences, setLanguage, updateNotifications } = useAccountPreferences();

  useEffect(() => {
    const handleAuthChange = () => setCurrentUser(getStoredUser());
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
  }, []);

  useEffect(() => {
    const syncAddresses = () => setSavedAddressesCount(getDeliveryAddresses().length);
    window.addEventListener(ADDRESS_CHANGE_EVENT, syncAddresses);
    return () => window.removeEventListener(ADDRESS_CHANGE_EVENT, syncAddresses);
  }, []);

  const { data: customerOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: queryKeys.orders.customer(),
    queryFn: ({ signal }) => marketplaceApi.getCustomerOrders({ signal }),
    enabled: Boolean(currentUser),
    staleTime: 30_000,
    refetchOnWindowFocus: true
  });

  const { data: serviceBookings = [] } = useQuery({
    queryKey: ["customer-service-bookings"],
    queryFn: ({ signal }) => marketplaceApi.getCustomerServiceBookings({ signal }).catch(() => []),
    enabled: Boolean(currentUser),
    staleTime: 60_000
  });

  const handleOpenHelp = () => {
    window.dispatchEvent(new Event("etukas_open_support_chat"));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await marketplaceApi.logout();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Signed-out Flipkart-style Etukas welcome view
  if (!currentUser) {
    return (
      <main className="min-h-[82vh] bg-white px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-etukas-black">Hey, Guest</h1>
              <p className="mt-0.5 text-xs text-gray-500">Sign in to manage orders, reviews &amp; site addresses</p>
            </div>
            <button
              type="button"
              onClick={handleOpenHelp}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-etukas-black shadow-xs hover:border-etukas-red/40 hover:text-etukas-red"
            >
              <Headphones size={15} className="text-etukas-red" />
              <span>Help</span>
            </button>
          </div>

          <div className="rounded-2xl border border-etukas-red/15 bg-gradient-to-br from-etukas-pink via-white to-rose-50/70 p-6 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-etukas-red text-white shadow-md shadow-red-500/20">
              <UserRound size={28} />
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-etukas-black">Your Etukas Account</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-gray-600">
              Track building material deliveries live, claim wholesale coupons, rate suppliers, and save your construction site addresses.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-etukas-red px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700"
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-etukas-black transition hover:border-etukas-red/40 hover:bg-etukas-pink/40"
              >
                <UserPlus size={16} />
                <span>Create Account</span>
              </Link>
            </div>
          </div>

          <RecentlyViewedSection />
          <CouponsOffersSection claimedCount={preferences.claimedCouponIds.length} />
          <SponsoredSection />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-10 pt-4 sm:bg-gray-50/70 sm:py-8">
      <div className="mx-auto max-w-2xl px-4 sm:rounded-3xl sm:border sm:border-gray-200/80 sm:bg-white sm:p-7 sm:shadow-sm">
        <div className="space-y-6">
          {/* 1. Header: Hey, <Name> + Help */}
          <AccountHeader user={currentUser} onOpenHelp={handleOpenHelp} />

          {/* 2. Quick Action Cards: Orders & Wishlist (Etukas Colors) */}
          <AccountQuickActions ordersCount={customerOrders.length} wishlistCount={wishlistCount} />

          {/* 3. Recently Viewed Stores & Products */}
          <RecentlyViewedSection />

          {/* 4. Coupons & Offers -> Opens /account/coupons */}
          <CouponsOffersSection claimedCount={preferences.claimedCouponIds.length} />

          {/* 5. Sponsored Ad Slot (Future Sponsorships Ready) */}
          <SponsoredSection />

          {/* 6. Ratings & Reviews for Latest Order -> View all opens /account/reviews */}
          <LatestOrderReviewSection
            orders={customerOrders}
            isLoading={loadingOrders}
            onRateOrder={(order, initialRating) => setReviewTarget({ order, initialRating })}
          />

          {/* 7. Profile Settings, Privacy & Security, Earn with Etukas, Feedback & Info */}
          <AccountSettingsMenu
            user={currentUser}
            language={preferences.language}
            savedAddressesCount={savedAddressesCount}
            serviceBookingsCount={serviceBookings.length}
            onOpenModal={(modal) => setActiveModal(modal)}
          />

          {/* 8. Follow Us On, Log out, Version, Brand Watermark */}
          <AccountFooterSection onLogout={handleLogout} isLoggingOut={isLoggingOut} />
        </div>
      </div>

      {/* Reusable Review Submission Modal */}
      <OrderReviewModal
        order={reviewTarget?.order ?? null}
        initialRating={reviewTarget?.initialRating}
        onClose={() => setReviewTarget(null)}
      />

      {/* Profile, Language, Notifications, Privacy, Devices, Policies & FAQs Modals */}
      <AccountModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        user={currentUser}
        preferences={preferences}
        onChangeLanguage={setLanguage}
        onUpdateNotifications={updateNotifications}
        onUserUpdated={(updated) => setCurrentUser(updated)}
      />
    </main>
  );
}
