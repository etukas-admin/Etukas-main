import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Wrench,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  X,
  Camera,
  Upload,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  LocateFixed,
  DollarSign,
  Star,
  BadgeCheck
} from "lucide-react";
import {
  AVAILABLE_SKILLS,
  DISTANCE_OPTIONS,
  WORKING_HOUR_OPTIONS,
  DAYS_OF_WEEK,
  TECHNICIAN_AVATARS,
  type TechnicianAvatar
} from "./technicianAvatars";
import {
  marketplaceApi,
  type TechnicianRegistrationInput,
  type SellerRegistrationResult
} from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

type Props = {
  initialContact: {
    contactPerson: string;
    mobile: string;
    email: string;
  };
  userId?: string | null;
  onSuccess: (result: SellerRegistrationResult) => void;
  onBack: () => void;
};

export function TechnicianRegistrationForm({ initialContact, userId, onSuccess, onBack }: Props) {
  // Form state
  const [businessName, setBusinessName] = useState(
    initialContact.contactPerson ? `${initialContact.contactPerson} Technical Services` : ""
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["Plumber"]);
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Location
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("Kakinada");
  const [state, setState] = useState("Andhra Pradesh");
  const [postalCode, setPostalCode] = useState("533001");
  const [latitude, setLatitude] = useState<number | undefined>(16.9891);
  const [longitude, setLongitude] = useState<number | undefined>(82.2475);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);

  // Timing & Distance
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(25);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [workingHours, setWorkingHours] = useState<string>("8:00 AM - 6:00 PM (Standard)");

  // Charges
  const [chargePerHour, setChargePerHour] = useState<number>(350);
  const [chargePerDay, setChargePerDay] = useState<number>(1800);

  // Avatar & Photo
  const [selectedAvatar, setSelectedAvatar] = useState<string>(TECHNICIAN_AVATARS[0].url);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Experience & Bio
  const [experienceYears, setExperienceYears] = useState<number>(5);
  const [bio, setBio] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Toggle skills
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      if (selectedSkills.length === 1) {
        setFormError("Please select at least one skill or category.");
        return;
      }
      setFormError(null);
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setFormError(null);
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const addCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (!selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed]);
    }
    setCustomSkillInput("");
  };

  // Toggle days
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const selectDayPreset = (preset: "all" | "mon-sat" | "weekdays" | "weekends") => {
    if (preset === "all") setSelectedDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    else if (preset === "mon-sat") setSelectedDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    else if (preset === "weekdays") setSelectedDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    else if (preset === "weekends") setSelectedDays(["Sat", "Sun"]);
  };

  // GPS Location detector
  const detectLiveLocation = useCallback(() => {
    setLocationMsg(null);
    if (!navigator.geolocation) {
      setLocationMsg("Geolocation not supported. Enter manually.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setLocationMsg(`GPS Captured: ${lat}, ${lng}`);
        setIsLocating(false);
      },
      () => {
        setLocationMsg("Location permission denied. Enter manually.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Custom photo upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomPhoto(base64);
      setSelectedAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (payload: TechnicianRegistrationInput) =>
      marketplaceApi.registerTechnician(payload),
    onSuccess: (data) => {
      onSuccess({
        sellerId: data.partnerId,
        businessName: data.businessName,
        storeName: data.businessName,
        storeCity: data.technician.city,
        email: data.technician.email,
        username: data.technician.email,
        registrationStep: 2,
        message: data.message
      });
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to submit technician registration");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setFormError("Service / Business name is required.");
      return;
    }
    if (selectedSkills.length === 0) {
      setFormError("Please select at least one skill or category.");
      return;
    }
    if (!addressLine1.trim()) {
      setFormError("Address is required.");
      return;
    }

    setFormError(null);
    registerMutation.mutate({
      userId: userId || undefined,
      contactPerson: initialContact.contactPerson,
      mobile: initialContact.mobile,
      email: initialContact.email,
      businessName: businessName.trim(),
      categories: selectedSkills,
      addressLine1: addressLine1.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      latitude,
      longitude,
      serviceRadiusKm,
      availableDays: selectedDays,
      workingHours,
      chargePerHour: Number(chargePerHour) || 350,
      chargePerDay: Number(chargePerDay) || 1800,
      avatar: selectedAvatar,
      experienceYears: Number(experienceYears) || 3,
      bio: bio.trim() || undefined
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fadeIn rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-100/50 md:p-8"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#e94560] to-[#f97316] text-white">
          <Wrench size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-gray-900">
              Technician & Professional Setup
            </h2>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
              Partner Service
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Set your skills, working hours, service charges, coverage radius & avatar
          </p>
        </div>
      </div>

      {formError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {formError}
        </div>
      )}

      {/* ── 1. Trade / Business Name ── */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700">
          Service or Business / Trade Name *
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Sri Sai Plumbing & Sanitary Works"
            className="mt-2"
            required
          />
        </label>
        <p className="mt-1 text-xs text-gray-400">
          This name appears on customer marketplace service cards
        </p>
      </div>

      {/* ── 2. Category / Skills Selection (+ Add skills type multi-select) ── */}
      <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Sparkles size={16} className="text-orange-500" />
              Service Categories & Skills (Select one or more works) *
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Since you can do multiple works, choose all trades you offer using the + buttons
            </p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-orange-600 shadow-2xs">
            {selectedSkills.length} Selected
          </span>
        </div>

        {/* Selected Skills Chips */}
        {selectedSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-b border-orange-100/60 pb-3">
            {selectedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-2xs"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="rounded-full hover:bg-orange-600 p-0.5"
                  aria-label={`Remove ${skill}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Preset Skills List with + Buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {AVAILABLE_SKILLS.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                  isSelected
                    ? "bg-orange-500 text-white shadow-sm ring-2 ring-orange-500/30"
                    : "border border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:bg-orange-50/50"
                }`}
              >
                {isSelected ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                <span>{skill}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Skill Input */}
        <div className="mt-3.5 flex gap-2">
          <Input
            value={customSkillInput}
            onChange={(e) => setCustomSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSkill();
              }
            }}
            placeholder="Add custom skill (e.g. Aluminium Sliding Doors)..."
            className="h-9 text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={addCustomSkill}
            className="h-9 shrink-0 px-3 text-xs font-bold text-orange-700"
          >
            <Plus size={14} /> Add Skill
          </Button>
        </div>
      </div>

      {/* ── 3. Charges (Per Hour & Per Day) ── */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <DollarSign size={16} className="text-emerald-600" />
          Service Charges (Hour & Day Rates) *
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Customers can book you by hour or by full day. Enter your standard rates.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-gray-700">
            Charge Per Hour (₹) *
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                ₹
              </span>
              <Input
                type="number"
                min={50}
                max={10000}
                value={chargePerHour}
                onChange={(e) => setChargePerHour(Number(e.target.value))}
                className="pl-8"
                required
              />
            </div>
            <span className="mt-1 block text-[11px] text-gray-400">
              Standard local rate: ₹300 - ₹500/hr
            </span>
          </label>

          <label className="block text-xs font-semibold text-gray-700">
            Charge Per Day (₹) *
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                ₹
              </span>
              <Input
                type="number"
                min={200}
                max={50000}
                value={chargePerDay}
                onChange={(e) => setChargePerDay(Number(e.target.value))}
                className="pl-8"
                required
              />
            </div>
            <span className="mt-1 block text-[11px] text-gray-400">
              Standard 8-hour day rate: ₹1,500 - ₹2,500/day
            </span>
          </label>
        </div>
      </div>

      {/* ── 4. Distance Range (25km, 40km, etc.) ── */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <MapPin size={16} className="text-blue-500" />
          Service Distance Range / Travel Radius *
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          How far are you willing to travel to construction sites or customer homes?
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DISTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setServiceRadiusKm(opt.value)}
              className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                serviceRadiusKm === opt.value
                  ? "border-blue-500 bg-blue-50/80 text-blue-900 shadow-xs"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-base font-extrabold">{opt.value} km</span>
              <span className="mt-0.5 text-[10px] text-gray-500">{opt.label.split("(")[1]?.replace(")", "") || "Radius"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 5. Available Time & Days ── */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Calendar size={16} className="text-indigo-500" />
          Available Time & Days *
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Select the days of the week and working hours you are available for service requests
        </p>

        {/* Days Presets */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => selectDayPreset("all")}
            className="rounded-lg bg-gray-200/80 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300"
          >
            All 7 Days
          </button>
          <button
            type="button"
            onClick={() => selectDayPreset("mon-sat")}
            className="rounded-lg bg-gray-200/80 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300"
          >
            Mon - Sat
          </button>
          <button
            type="button"
            onClick={() => selectDayPreset("weekdays")}
            className="rounded-lg bg-gray-200/80 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300"
          >
            Weekdays Only
          </button>
        </div>

        {/* Day Pills */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`flex h-9 w-12 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Working Hours */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-700">
            Available Working Hours
            <select
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-xs outline-none focus:border-indigo-500"
            >
              {WORKING_HOUR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ── 6. Technicians Location & GPS ── */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <MapPin size={16} className="text-red-500" />
          Technician Base Location *
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Used to calculate exact distance to customers. Nearest technicians appear first to customers!
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-gray-700 sm:col-span-2">
            Address / Workshop Location *
            <Input
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Door No, Street Name, Landmark"
              className="mt-1 text-xs"
              required
            />
          </label>

          <label className="block text-xs font-semibold text-gray-700">
            City *
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Kakinada"
              className="mt-1 text-xs"
              required
            />
          </label>

          <label className="block text-xs font-semibold text-gray-700">
            State *
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Andhra Pradesh"
              className="mt-1 text-xs"
              required
            />
          </label>

          <label className="block text-xs font-semibold text-gray-700">
            Postal Code *
            <Input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="533001"
              className="mt-1 text-xs"
              required
            />
          </label>

          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={detectLiveLocation}
              disabled={isLocating}
              className="h-10 w-full text-xs font-bold text-gray-700"
            >
              <LocateFixed size={15} />
              {isLocating ? "Capturing GPS..." : "Capture Live GPS"}
            </Button>
          </div>
        </div>

        {locationMsg && (
          <p className="mt-2 text-xs font-medium text-emerald-700">{locationMsg}</p>
        )}
      </div>

      {/* ── 7. Technician Avatar Selection (Appears in Customer Cards) ── */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Camera size={16} className="text-purple-600" />
              Select Technician Avatar for Service Card *
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Choose an avatar that represents your trade to appear in customer marketplace cards
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100"
          >
            <Upload size={12} /> Custom Photo
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        {/* Avatars Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TECHNICIAN_AVATARS.map((av) => {
            const isSelected = selectedAvatar === av.url;
            return (
              <div
                key={av.id}
                onClick={() => setSelectedAvatar(av.url)}
                className={`relative flex flex-col items-center rounded-2xl border-2 p-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? "border-orange-500 bg-white shadow-md ring-2 ring-orange-500/30"
                    : "border-gray-200 bg-white/60 hover:border-gray-300"
                }`}
              >
                <div className={`flex aspect-square w-16 items-center justify-center rounded-xl bg-gradient-to-br ${av.bgColor} p-1.5`}>
                  <img
                    src={av.url}
                    alt={av.label}
                    className="h-full w-full object-contain drop-shadow-sm"
                  />
                </div>
                <span className="mt-1.5 text-center text-[11px] font-extrabold text-gray-900">
                  {av.label}
                </span>
                <span className="text-[10px] text-gray-500">{av.category}</span>
                {isSelected && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-white">
                    <CheckCircle2 size={12} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Marketplace Preview Card */}
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Live Preview (How your card appears to customers):
          </p>
          <div className="mt-2.5 max-w-[200px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gray-100 p-2">
              <span className="absolute left-2 top-2 rounded-xs bg-emerald-600 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase">
                VERIFIED
              </span>
              <img
                src={selectedAvatar}
                alt="Preview"
                className="h-full w-full object-contain"
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-0.5 rounded-sm bg-white/90 px-1 py-0.5 text-[9px] font-bold">
                <span>5.0</span>
                <Star size={9} className="fill-emerald-600 text-emerald-600" />
                <span className="text-gray-400">| New</span>
              </div>
            </div>
            <div className="mt-2">
              <p className="flex items-center gap-1 text-[11px] font-extrabold text-gray-900 uppercase line-clamp-1">
                <BadgeCheck size={12} className="text-blue-600" />
                {businessName || initialContact.contactPerson}
              </p>
              <p className="text-[10px] text-gray-500 line-clamp-1">
                {selectedSkills.join(", ")}
              </p>
              <p className="mt-1 text-xs font-extrabold text-gray-900">
                ₹{chargePerHour} <span className="text-[9px] font-normal text-gray-500">/ hr</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 8. Experience & Bio ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-gray-700">
          Years of Experience *
          <Input
            type="number"
            min={0}
            max={50}
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value))}
            className="mt-1"
          />
        </label>
        <label className="block text-xs font-semibold text-gray-700 sm:col-span-2">
          Short Bio / Specialization Description
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            placeholder="Tell customers about your major works, past experience, tools you own..."
            className="mt-1 w-full rounded-md border border-gray-300 p-2.5 text-xs outline-none focus:border-orange-500"
          />
        </label>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          disabled={registerMutation.isPending}
          className="flex-1 bg-gradient-to-r from-[#e94560] to-[#f97316] text-white hover:opacity-90 font-bold"
        >
          {registerMutation.isPending ? "Registering..." : (
            <>
              Register as Technician Partner <ArrowRight size={18} />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

