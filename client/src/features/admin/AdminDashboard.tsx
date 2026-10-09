import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { marketplaceApi, type SellerEnquiry } from "../../services/api";

function formatCoordinate(value: SellerEnquiry["latitude"]) {
  return value === null || value === undefined ? null : String(value);
}

function mapUrl(latitude: string, longitude: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

export function AdminDashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const enquiries = useQuery({ queryKey: ["admin", "seller-enquiries"], queryFn: marketplaceApi.adminSellerEnquiries });
  const selectedEnquiry = useQuery({
    queryKey: ["admin", "seller-enquiries", selectedId],
    queryFn: () => marketplaceApi.adminSellerEnquiry(selectedId!),
    enabled: Boolean(selectedId)
  });
  const detail = selectedEnquiry.data;
  const latitude = formatCoordinate(detail?.latitude);
  const longitude = formatCoordinate(detail?.longitude);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
      <p className="mt-2 text-gray-600">Protected admin APIs enforce ADMIN authorization server-side.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {["Marketplace overview", "Seller applications", "Product moderation", "Audit logs"].map((item) => (
          <article key={item} className="rounded-md border border-gray-100 p-5 font-semibold">{item}</article>
        ))}
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-xl font-extrabold">Seller enquiries</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-gray-100">
            {enquiries.isLoading ? <p className="p-4 text-sm text-gray-500">Loading enquiries...</p> : null}
            {enquiries.data?.map((enquiry) => (
              <button
                key={enquiry.id}
                type="button"
                onClick={() => setSelectedId(enquiry.id)}
                className={`block w-full border-b border-gray-100 p-4 text-left hover:bg-etukas-pink ${selectedId === enquiry.id ? "bg-etukas-pink" : "bg-white"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">{enquiry.businessName}</span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold">{enquiry.status}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{enquiry.contactPerson} - {enquiry.city}, {enquiry.state}</p>
              </button>
            ))}
            {enquiries.data?.length === 0 ? <p className="p-4 text-sm text-gray-500">No seller enquiries yet.</p> : null}
          </div>
        </div>

        <aside className="h-fit rounded-md border border-gray-100 p-5">
          <h2 className="text-lg font-extrabold">Enquiry detail</h2>
          {!selectedId ? <p className="mt-3 text-sm text-gray-500">Select an enquiry to review shop details.</p> : null}
          {selectedEnquiry.isLoading ? <p className="mt-3 text-sm text-gray-500">Loading detail...</p> : null}
          {detail ? (
            <div className="mt-4 space-y-3 text-sm">
              <p><strong>Business:</strong> {detail.businessName}</p>
              <p><strong>Contact:</strong> {detail.contactPerson}</p>
              <p><strong>Email:</strong> {detail.email}</p>
              <p><strong>Mobile:</strong> {detail.mobile}</p>
              <p><strong>Address:</strong> {detail.addressLine1}, {detail.city}, {detail.state} {detail.postalCode}</p>
              <div className="rounded-md bg-gray-50 p-3">
                <h3 className="font-bold">Shop location</h3>
                {latitude && longitude ? (
                  <>
                    <p className="mt-2">Latitude: {latitude}</p>
                    <p>Longitude: {longitude}</p>
                    <a className="mt-3 inline-flex items-center gap-1 font-semibold text-etukas-red" href={mapUrl(latitude, longitude)} target="_blank" rel="noreferrer">
                      View on Map <ExternalLink size={14} />
                    </a>
                  </>
                ) : (
                  <p className="mt-2 text-gray-600">Shop location not provided.</p>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
