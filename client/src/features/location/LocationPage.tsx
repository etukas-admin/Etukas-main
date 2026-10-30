import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, Check, Crosshair, Home, MapPin, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import { getDeliveryAddresses, getSelectedAddressId, saveDeliveryAddresses, type DeliveryAddress } from "./locationStore";

const areaSuggestions = ["Gachibowli, Hyderabad", "Kondapur, Hyderabad", "Madhapur, Hyderabad", "Hitech City, Hyderabad", "Manikonda, Hyderabad", "Kukatpally, Hyderabad", "Miyapur, Hyderabad", "Secunderabad, Hyderabad"];
const emptyForm = { label: "Home" as DeliveryAddress["label"], recipient: "", line1: "", line2: "", landmark: "", city: "", postalCode: "" };

export function LocationPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState(getDeliveryAddresses);
  const [selectedId, setSelectedId] = useState(getSelectedAddressId);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  const suggestions = useMemo(() => query.trim() ? areaSuggestions.filter((area) => area.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [], [query]);
  const updateAddresses = (next: DeliveryAddress[], nextSelected: string | null) => {
    setAddresses(next);
    setSelectedId(nextSelected);
    saveDeliveryAddresses(next, nextSelected);
  };
  const chooseAddress = (id: string) => {
    updateAddresses(addresses, id);
    navigate("/");
  };
  const addAddress = () => {
    if (!form.line1.trim() || !form.city.trim()) return;
    const address: DeliveryAddress = { ...form, id: crypto.randomUUID(), recipient: form.recipient.trim() || "Myself", line1: form.line1.trim(), line2: form.line2.trim(), landmark: form.landmark.trim(), city: form.city.trim(), postalCode: form.postalCode.trim() };
    updateAddresses([...addresses, address], address.id);
    setShowForm(false);
    setForm(emptyForm);
    setMessage("Address saved and selected for delivery.");
  };
  const locate = () => {
    setMessage("");
    if (!navigator.geolocation) { setMessage("Location is not supported on this device. Search for your area instead."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      let city = "Hyderabad";
      let line1 = `Current location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`);
        if (response.ok) {
          const result = await response.json() as { display_name?: string; address?: { suburb?: string; neighbourhood?: string; city?: string; town?: string; postcode?: string } };
          line1 = result.address?.neighbourhood || result.address?.suburb || result.display_name?.split(",")[0] || line1;
          city = result.address?.city || result.address?.town || "Hyderabad";
        }
      } catch { /* Coordinates still provide a useful location. */ }
      const address: DeliveryAddress = { ...emptyForm, id: crypto.randomUUID(), label: "Other", recipient: "Myself", line1, line2: "", landmark: "", city, postalCode: "", latitude: coords.latitude, longitude: coords.longitude };
      updateAddresses([...addresses.filter((item) => item.id !== "current-location"), address], address.id);
      setLocating(false);
      navigate("/");
    }, (error) => {
      setLocating(false);
      setMessage(error.code === error.PERMISSION_DENIED ? "Location permission was denied. Search for your area or add an address." : "We couldn't detect your location. Please search for your area.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  const chooseSuggestion = (suggestion: string) => {
    const [area, ...cityParts] = suggestion.split(",");
    setQuery("");
    setForm({ ...emptyForm, line1: area.trim(), city: cityParts.join(",").trim() });
    setShowForm(true);
  };

  return <main className="min-h-[calc(100vh-8rem)] bg-emerald-50/60 px-3 py-4 md:px-6 md:py-8">
    <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl shadow-emerald-950/5">
      <header className="flex items-center gap-4 bg-etukas-black px-5 py-5 text-white md:px-8">
        <button onClick={() => navigate("/")} aria-label="Go back" className="rounded-full p-2 hover:bg-white/10"><ArrowLeft size={21}/></button>
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Etukas delivery</p><h1 className="text-lg font-extrabold md:text-xl">Choose your location</h1></div>
      </header>
      <div className="space-y-7 p-5 md:p-8">
        <section className="relative">
          <label className="relative block"><Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search area, city or PIN code" className="h-14 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" aria-label="Search area, city or PIN code"/></label>
          {suggestions.length ? <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => chooseSuggestion(suggestion)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-emerald-50"><MapPin size={17} className="text-emerald-700"/>{suggestion}</button>)}</div> : null}
          <button onClick={locate} disabled={locating} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"><Crosshair size={19}/>{locating ? "Finding your location…" : "Use my current location"}</button>
          {message ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p> : null}
        </section>

        {showForm ? <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-extrabold">Add address details</h2><button onClick={() => setShowForm(false)} className="text-sm font-semibold text-gray-500">Cancel</button></div>
          <p className="mb-2 text-sm font-semibold text-gray-600">Save address as</p><div className="mb-5 grid grid-cols-3 gap-2">{(["Home", "Office", "Other"] as const).map((label) => <button key={label} onClick={() => setForm({ ...form, label })} className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm font-semibold ${form.label === label ? "border-emerald-600 bg-emerald-100 text-emerald-800" : "border-gray-200 bg-white"}`}>{label === "Home" ? <Home size={16}/> : label === "Office" ? <BriefcaseBusiness size={16}/> : <MapPin size={16}/>} {label}</button>)}</div>
          <div className="grid gap-3 sm:grid-cols-2">{([["recipient", "Name (optional)"], ["line1", "Address / house number *"], ["line2", "Street / building (optional)"], ["landmark", "Landmark (optional)"], ["city", "Area / city *"], ["postalCode", "PIN code (optional)"]] as const).map(([key, placeholder]) => <input key={key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} className="h-12 min-w-0 rounded-lg border border-gray-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/> )}</div>
          <button onClick={addAddress} disabled={!form.line1.trim() || !form.city.trim()} className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-45">Save and use this address</button>
        </section> : null}

        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-gray-700">Saved addresses <span className="ml-1 text-gray-400">{addresses.length || ""}</span></h2><button onClick={() => { setShowForm(true); setMessage(""); }} className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900"><Plus size={18}/> Add address</button></div>
          {addresses.length ? <ul className="space-y-3">{addresses.map((address) => { const selected = address.id === selectedId; return <li key={address.id} className={`flex items-start gap-3 rounded-xl border p-4 transition ${selected ? "border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600" : "border-gray-200 hover:border-emerald-300"}`}><button onClick={() => chooseAddress(address.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">{address.label === "Home" ? <Home size={21}/> : address.label === "Office" ? <BriefcaseBusiness size={21}/> : <MapPin size={21}/>}</span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 font-bold text-gray-900">{address.label}<span className="text-sm font-medium text-gray-500">{address.recipient && `· ${address.recipient}`}</span>{selected && <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">Selected</span>}</span><span className="mt-1 block text-sm leading-5 text-gray-600">{[address.line1, address.line2, address.landmark, address.city, address.postalCode].filter(Boolean).join(", ")}</span></span></button><div className="flex items-center gap-1">{selected && <Check size={19} className="text-emerald-700"/>}<button aria-label={`Delete ${address.label} address`} onClick={() => updateAddresses(addresses.filter((item) => item.id !== address.id), selected ? null : selectedId)} className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17}/></button><MoreVertical size={17} className="hidden text-gray-400 sm:block"/></div></li>; })}</ul> : <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center"><MapPin className="mx-auto text-emerald-700"/><p className="mt-2 font-semibold">No saved addresses yet</p><p className="mt-1 text-sm text-gray-500">Add an address or use your current location to get started.</p></div>}
        </section>
        <p className="text-xs leading-relaxed text-gray-400">Your saved delivery addresses stay on this device. Your browser asks before sharing your current location.</p>
      </div>
    </div>
  </main>;
}
