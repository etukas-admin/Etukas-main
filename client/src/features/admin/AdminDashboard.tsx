import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, LogOut, Trash2 } from "lucide-react";
import { marketplaceApi, clearSession, getStoredUser, type AdminSeller, type HomepageBanner, type HomepageBannerInput, type SellerEnquiry, type User } from "../../services/api";

const emptyBanner: HomepageBannerInput = {
  eyebrow: "",
  title: "",
  description: "",
  imageUrl: "",
  mobileImageUrl: null,
  linkUrl: null,
  sortOrder: 0,
  isActive: true
};

function coordinate(value: AdminSeller["stores"][number]["latitude"]) {
  return value === null || value === undefined ? null : String(value);
}

function mapUrl(latitude: string, longitude: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const delimiter = result.indexOf(",");
      if (delimiter < 0) reject(new Error("Could not read the selected image."));
      else resolve(result.slice(delimiter + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: async () => {
      const user = await marketplaceApi.login({ identifier: identifier.trim(), password });
      if (!user.roles.includes("ADMIN")) {
        await marketplaceApi.logout();
        throw new Error("This account does not have administrator access.");
      }
      return user;
    },
    onSuccess: onLogin
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <form
        className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate();
        }}
      >
        <h1 className="text-2xl font-extrabold">Etukas Admin</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in with an administrator account to manage partners and homepage banners.</p>
        <label className="mt-6 block text-sm font-semibold">
          Email
          <input
            required
            autoComplete="username"
            type="email"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input
            required
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        {login.error ? <p role="alert" className="mt-4 text-sm text-red-700">{login.error.message}</p> : null}
        <button disabled={login.isPending} className="mt-5 w-full rounded-md bg-etukas-red px-4 py-2 font-bold text-white disabled:opacity-60">
          {login.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function SellerCard({ seller, onStatusChange, isPending }: {
  seller: AdminSeller;
  onStatusChange: (seller: AdminSeller, status: "PENDING" | "APPROVED" | "REJECTED") => void;
  isPending: boolean;
}) {
  return (
    <article className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{seller.businessName || seller.contactPerson}</h3>
          <p className="mt-1 text-sm text-gray-600">{seller.contactPerson} · {seller.businessType}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">{seller.verificationStatus}</span>
      </div>
      <p className="mt-3 text-sm">{seller.user.email} · {seller.user.mobile}</p>
      {seller.sellerId ? <p className="mt-1 text-xs text-gray-500">Partner ID: {seller.sellerId}</p> : null}
      {seller.gstin ? <p className="mt-1 text-xs text-gray-500">GSTIN: {seller.gstin}</p> : null}
      {seller.rejectionReason ? <p className="mt-2 text-sm text-red-700">Reason: {seller.rejectionReason}</p> : null}
      <div className="mt-4 space-y-3">
        {seller.stores.map((store) => {
          const latitude = coordinate(store.latitude);
          const longitude = coordinate(store.longitude);
          return (
            <div key={store.id} className="rounded-md bg-gray-50 p-3 text-sm">
              <p className="font-semibold">{store.name} <span className="font-normal text-gray-500">({store.isActive ? "active" : "inactive"})</span></p>
              <p className="mt-1 text-gray-600">{store.addressLine1}, {store.city}, {store.state} {store.postalCode}</p>
              <p className="text-gray-600">{store.phone}</p>
              {latitude && longitude ? (
                <a className="mt-2 inline-flex items-center gap-1 font-semibold text-etukas-red" href={mapUrl(latitude, longitude)} target="_blank" rel="noreferrer">
                  Open location <ExternalLink size={14} />
                </a>
              ) : <p className="mt-2 text-xs text-gray-500">Coordinates not provided</p>}
            </div>
          );
        })}
        {seller.stores.length === 0 ? <p className="text-sm text-gray-500">No store location has been submitted.</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={isPending} onClick={() => onStatusChange(seller, "APPROVED")} className="rounded-md bg-green-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve partner</button>
        <button disabled={isPending} onClick={() => onStatusChange(seller, "REJECTED")} className="rounded-md bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Reject</button>
        {seller.verificationStatus !== "PENDING" ? (
          <button disabled={isPending} onClick={() => onStatusChange(seller, "PENDING")} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-bold disabled:opacity-50">Set pending</button>
        ) : null}
      </div>
    </article>
  );
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const [sessionUser, setSessionUser] = useState<User | null>(() => getStoredUser());
  const [draft, setDraft] = useState<HomepageBannerInput>(emptyBanner);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [partnerFilter, setPartnerFilter] = useState("");
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);
  const me = useQuery({ queryKey: ["admin", "me"], queryFn: marketplaceApi.me, enabled: Boolean(sessionUser), retry: false });
  const sellers = useQuery({ queryKey: ["admin", "sellers"], queryFn: marketplaceApi.adminSellers, enabled: Boolean(me.data?.roles.includes("ADMIN")) });
  const banners = useQuery({ queryKey: ["admin", "banners"], queryFn: marketplaceApi.adminBanners, enabled: Boolean(me.data?.roles.includes("ADMIN")) });
  const enquiries = useQuery({ queryKey: ["admin", "seller-enquiries"], queryFn: marketplaceApi.adminSellerEnquiries, enabled: Boolean(me.data?.roles.includes("ADMIN")) });
  const selectedEnquiry = useQuery({
    queryKey: ["admin", "seller-enquiries", selectedEnquiryId],
    queryFn: () => marketplaceApi.adminSellerEnquiry(selectedEnquiryId!),
    enabled: Boolean(me.data?.roles.includes("ADMIN") && selectedEnquiryId)
  });

  useEffect(() => {
    if (me.isError) {
      clearSession();
      setSessionUser(null);
    }
  }, [me.isError]);
  useEffect(() => {
    if (me.data && !me.data.roles.includes("ADMIN")) {
      clearSession();
      setSessionUser(null);
    }
  }, [me.data]);

  const sellerStatus = useMutation({
    mutationFn: ({ seller, status }: { seller: AdminSeller; status: "PENDING" | "APPROVED" | "REJECTED" }) => {
      const rejectionReason = status === "REJECTED" ? window.prompt("Optional rejection reason:") : undefined;
      if (status === "REJECTED" && rejectionReason === null) return Promise.reject(new Error("Rejection cancelled."));
      return marketplaceApi.adminUpdateSellerStatus(seller.id, status, rejectionReason ?? undefined);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sellers"] })
  });

  const saveBanner = useMutation({
    mutationFn: async () => {
      if (imageFile && imageFile.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
      let imageUrl = draft.imageUrl;
      if (imageFile) {
        const imageData = await imageToBase64(imageFile);
        imageUrl = (await marketplaceApi.adminUploadBannerImage({ contentType: imageFile.type, imageData })).url;
      }
      if (!imageUrl) throw new Error("Select a banner image before saving.");
      const input = {
        ...draft,
        title: draft.title.trim(),
        imageUrl,
        mobileImageUrl: draft.mobileImageUrl || null,
        linkUrl: draft.linkUrl || null,
        sortOrder: Number(draft.sortOrder)
      };
      return editingId ? marketplaceApi.adminUpdateBanner(editingId, input) : marketplaceApi.adminCreateBanner(input);
    },
    onSuccess: () => {
      setDraft(emptyBanner);
      setEditingId(null);
      setImageFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      queryClient.invalidateQueries({ queryKey: ["home", "banners"] });
    }
  });
  const deleteBanner = useMutation({
    mutationFn: marketplaceApi.adminDeleteBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      queryClient.invalidateQueries({ queryKey: ["home", "banners"] });
    }
  });

  if (!sessionUser) return <LoginForm onLogin={setSessionUser} />;
  if (me.isLoading || !me.data) {
    return <main className="mx-auto max-w-5xl px-4 py-12 text-sm text-gray-600">Verifying administrator access...</main>;
  }
  if (!me.data.roles.includes("ADMIN")) {
    return <LoginForm onLogin={setSessionUser} />;
  }

  const updateDraft = (updates: Partial<HomepageBannerInput>) => setDraft((current) => ({ ...current, ...updates }));
  const startEditing = (banner: HomepageBanner) => {
    setDraft({
      eyebrow: banner.eyebrow,
      title: banner.title,
      description: banner.description,
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl,
      linkUrl: banner.linkUrl,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive
    });
    setImageFile(null);
    setEditingId(banner.id);
  };
  const searchTerm = partnerFilter.trim().toLowerCase();
  const filteredSellers = sellers.data?.filter((seller) =>
    `${seller.businessName} ${seller.contactPerson} ${seller.user.email} ${seller.stores.map((store) => `${store.city} ${store.state} ${store.postalCode}`).join(" ")}`
      .toLowerCase()
      .includes(searchTerm)
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Etukas Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Signed in as {me.data.name} · {me.data.email}</p>
        </div>
        <button
          onClick={() => { void marketplaceApi.logout(); setSessionUser(null); }}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold"
        >
          <LogOut size={16} /> Sign out
        </button>
      </header>

      {sellerStatus.error || saveBanner.error || deleteBanner.error ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {(sellerStatus.error || saveBanner.error || deleteBanner.error)?.message}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-xl font-extrabold">Partners and locations</h2>
        <label className="mt-3 block max-w-lg text-sm font-semibold">
          Filter by partner, city, state, or postal code
          <input value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        {sellers.isLoading ? <p className="mt-3 text-sm text-gray-500">Loading partner applications...</p> : null}
        {sellers.error ? <p role="alert" className="mt-3 text-sm text-red-700">{sellers.error.message}</p> : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filteredSellers?.map((seller) => (
            <SellerCard key={seller.id} seller={seller} onStatusChange={(selected, status) => sellerStatus.mutate({ seller: selected, status })} isPending={sellerStatus.isPending} />
          ))}
        </div>
        {sellers.data?.length === 0 || filteredSellers?.length === 0 ? <p className="mt-3 text-sm text-gray-500">No partners match this filter.</p> : null}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-extrabold">Homepage banners</h2>
        <p className="mt-1 text-sm text-gray-600">Upload JPEG, PNG, or WebP images up to 5 MB. Active banners appear on the homepage.</p>
        <form
          className="mt-4 grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-2"
          onSubmit={(event) => { event.preventDefault(); saveBanner.mutate(); }}
        >
          <label className="text-sm font-semibold">Eyebrow
            <input value={draft.eyebrow} onChange={(event) => updateDraft({ eyebrow: event.target.value })} maxLength={100} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold">Headline
            <input required value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} maxLength={160} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold md:col-span-2">Description
            <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} maxLength={300} rows={2} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold md:col-span-2">Banner image
            <input required={!draft.imageUrl && !imageFile} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 font-normal" />
            {draft.imageUrl && !imageFile ? <span className="mt-1 block text-xs text-gray-500">Current image retained unless you choose a new file.</span> : null}
          </label>
          <label className="text-sm font-semibold">Link path (optional)
            <input value={draft.linkUrl ?? ""} onChange={(event) => updateDraft({ linkUrl: event.target.value || null })} placeholder="/products" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold">Display order
            <input type="number" min="0" max="10000" value={draft.sortOrder} onChange={(event) => updateDraft({ sortOrder: Number(event.target.value) })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={draft.isActive} onChange={(event) => updateDraft({ isActive: event.target.checked })} />
            Active
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button disabled={saveBanner.isPending} className="inline-flex items-center gap-2 rounded-md bg-etukas-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <ImagePlus size={16} /> {saveBanner.isPending ? "Saving..." : editingId ? "Save banner" : "Add banner"}
            </button>
            {editingId ? <button type="button" onClick={() => { setDraft(emptyBanner); setEditingId(null); setImageFile(null); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">Cancel edit</button> : null}
          </div>
        </form>
        {banners.error ? <p role="alert" className="mt-3 text-sm text-red-700">{banners.error.message}</p> : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banners.data?.map((banner) => (
            <article key={banner.id} className="overflow-hidden rounded-lg border border-gray-200">
              <img src={banner.imageUrl} alt={banner.title} className="h-36 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{banner.title}</h3>
                  <span className="text-xs font-semibold">{banner.isActive ? "Active" : "Hidden"}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{banner.eyebrow}</p>
                <p className="mt-1 text-xs text-gray-500">Order {banner.sortOrder}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => startEditing(banner)} className="rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold">Edit</button>
                  <button type="button" disabled={deleteBanner.isPending} onClick={() => { if (window.confirm("Delete this homepage banner?")) deleteBanner.mutate(banner.id); }} className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-extrabold">Seller enquiries</h2>
        <p className="mt-1 text-sm text-gray-600">Enquiries submitted before partner registration.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-2">
            {enquiries.isLoading ? <p className="text-sm text-gray-500">Loading enquiries...</p> : null}
            {enquiries.error ? <p role="alert" className="text-sm text-red-700">{enquiries.error.message}</p> : null}
            {enquiries.data?.map((enquiry) => (
              <button key={enquiry.id} type="button" onClick={() => setSelectedEnquiryId(enquiry.id)} className={`block w-full rounded-md border p-3 text-left ${selectedEnquiryId === enquiry.id ? "border-etukas-red bg-etukas-pink" : "border-gray-200 bg-white"}`}>
                <span className="font-bold">{enquiry.businessName}</span>
                <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs font-semibold">{enquiry.status}</span>
                <p className="mt-1 text-sm text-gray-600">{enquiry.contactPerson} · {enquiry.city}, {enquiry.state}</p>
              </button>
            ))}
            {enquiries.data?.length === 0 ? <p className="text-sm text-gray-500">No seller enquiries yet.</p> : null}
          </div>
          <aside className="h-fit rounded-md border border-gray-200 p-4">
            <h3 className="font-bold">Enquiry detail</h3>
            {selectedEnquiry.data ? <EnquiryDetails enquiry={selectedEnquiry.data} /> : <p className="mt-2 text-sm text-gray-500">Select an enquiry to review submitted contact and location details.</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}

function EnquiryDetails({ enquiry }: { enquiry: SellerEnquiry }) {
  const latitude = enquiry.latitude === null || enquiry.latitude === undefined ? null : String(enquiry.latitude);
  const longitude = enquiry.longitude === null || enquiry.longitude === undefined ? null : String(enquiry.longitude);
  return (
    <div className="mt-3 space-y-2 text-sm">
      <p><strong>Business:</strong> {enquiry.businessName}</p>
      <p><strong>Contact:</strong> {enquiry.contactPerson}</p>
      <p><strong>Email:</strong> {enquiry.email}</p>
      <p><strong>Mobile:</strong> {enquiry.mobile}</p>
      <p><strong>Address:</strong> {enquiry.addressLine1}, {enquiry.city}, {enquiry.state} {enquiry.postalCode}</p>
      {latitude && longitude ? <a className="inline-flex items-center gap-1 font-semibold text-etukas-red" href={mapUrl(latitude, longitude)} target="_blank" rel="noreferrer">View on map <ExternalLink size={14} /></a> : <p className="text-gray-500">Location coordinates not provided.</p>}
    </div>
  );
}
