import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LocateFixed, MapPinned, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { sellerEnquirySchema, type SellerEnquiryInput } from "@etukas/shared";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError, marketplaceApi } from "../../services/api";

const mapProviderConfigured = Boolean(import.meta.env.VITE_MAP_PROVIDER && import.meta.env.VITE_MAP_PROVIDER_API_KEY);

const defaultValues: SellerEnquiryInput = {
  contactPerson: "",
  businessName: "",
  email: "",
  mobile: "",
  businessType: "RETAILER",
  gstin: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  latitude: undefined,
  longitude: undefined
};

function geolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "Location permission was denied. You can enter coordinates manually.";
  if (error.code === error.POSITION_UNAVAILABLE) return "Your current location is unavailable. Please enter the shop coordinates manually.";
  if (error.code === error.TIMEOUT) return "Location detection timed out. Try again or enter coordinates manually.";
  return "Unable to detect your current location.";
}

export function SellerEnquiryPage() {
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const form = useForm<SellerEnquiryInput>({ resolver: zodResolver(sellerEnquirySchema), defaultValues });
  const submit = useMutation({
    mutationFn: marketplaceApi.submitSellerEnquiry,
    onError: (error) => {
      if (!(error instanceof ApiError) || !error.details || typeof error.details !== "object" || !("fieldErrors" in error.details)) return;

      const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const message = messages[0];
        if (message) {
          form.setError(field as keyof SellerEnquiryInput, { type: "server", message });
        }
      }
    }
  });

  const useCurrentLocation = () => {
    setLocationMessage(null);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location detection. Please enter coordinates manually.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("latitude", Number(position.coords.latitude.toFixed(7)), { shouldDirty: true, shouldValidate: true });
        form.setValue("longitude", Number(position.coords.longitude.toFixed(7)), { shouldDirty: true, shouldValidate: true });
        setLocationMessage("Coordinates added. Please confirm they match your actual shop or warehouse location.");
        setIsLocating(false);
      },
      (error) => {
        setLocationError(geolocationErrorMessage(error));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
      <form onSubmit={form.handleSubmit((values) => submit.mutate(values))} className="rounded-md border border-gray-100 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-extrabold text-etukas-black">Seller enquiry</h1>
        <p className="mt-2 text-sm text-gray-600">Tell us about your building materials shop so the Etukas team can review your seller request.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["contactPerson", "Contact person"],
            ["businessName", "Business name"],
            ["email", "Email"],
            ["mobile", "Mobile"],
            ["gstin", "GSTIN"],
            ["addressLine1", "Shop address"],
            ["city", "City"],
            ["state", "State"],
            ["postalCode", "Postal code"]
          ].map(([field, label]) => (
            <label key={field} className={field === "addressLine1" ? "block text-sm font-semibold md:col-span-2" : "block text-sm font-semibold"}>
              {label}
              <Input className="mt-2" type={field === "email" ? "email" : "text"} {...form.register(field as keyof SellerEnquiryInput)} />
              <span className="mt-1 block text-sm text-etukas-red">{form.formState.errors[field as keyof SellerEnquiryInput]?.message}</span>
            </label>
          ))}

          <label className="block text-sm font-semibold">
            Business type
            <select className="focus-ring mt-2 h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none" {...form.register("businessType")}>
              <option value="RETAILER">Retailer</option>
              <option value="WHOLESALER">Wholesaler</option>
              <option value="MANUFACTURER">Manufacturer</option>
            </select>
            <span className="mt-1 block text-sm text-etukas-red">{form.formState.errors.businessType?.message}</span>
          </label>
        </div>

        <section className="mt-8 rounded-md border border-etukas-pink bg-etukas-pink/40 p-4">
          <h2 className="text-lg font-extrabold text-etukas-black">Shop Location</h2>
          <p className="mt-2 text-sm text-gray-700">
            Adding your shop location is optional, but recommended. It helps customers discover your store when searching for nearby building material suppliers.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold">
              Latitude <span className="font-normal text-gray-500">(optional)</span>
              <Input className="mt-2" inputMode="decimal" placeholder="17.3850440" {...form.register("latitude")} />
              <span className="mt-1 block text-sm text-etukas-red">{form.formState.errors.latitude?.message}</span>
            </label>
            <label className="block text-sm font-semibold">
              Longitude <span className="font-normal text-gray-500">(optional)</span>
              <Input className="mt-2" inputMode="decimal" placeholder="78.4866710" {...form.register("longitude")} />
              <span className="mt-1 block text-sm text-etukas-red">{form.formState.errors.longitude?.message}</span>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={useCurrentLocation} disabled={isLocating}>
              <LocateFixed size={18} /> {isLocating ? "Detecting..." : "Use My Current Location"}
            </Button>
            {mapProviderConfigured ? (
              <Button type="button" variant="secondary" disabled title="Map picker integration is configured but not enabled in this build.">
                <MapPinned size={18} /> Select Shop Location on Map
              </Button>
            ) : null}
          </div>

          <p className="mt-3 text-xs text-gray-600">Browser location can differ from your exact shop location. You can edit both coordinates before submitting.</p>
          {locationMessage ? <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-etukas-green">{locationMessage}</p> : null}
          {locationError ? <p className="mt-3 rounded-md bg-white p-3 text-sm text-etukas-red">{locationError}</p> : null}
        </section>

        {submit.isSuccess ? <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-etukas-green">Seller enquiry submitted. Our team will review it soon.</p> : null}
        {submit.error ? <p className="mt-4 rounded-md bg-etukas-pink p-3 text-sm text-etukas-red">{submit.error.message}</p> : null}

        <Button className="mt-6 w-full" disabled={submit.isPending}>
          <Send size={18} /> {submit.isPending ? "Submitting..." : "Submit seller enquiry"}
        </Button>
      </form>
    </main>
  );
}
