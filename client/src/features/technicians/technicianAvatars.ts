export type TechnicianAvatar = {
  id: string;
  label: string;
  category: string;
  url: string;
  badge: string;
  bgColor: string;
};

export const TECHNICIAN_AVATARS: TechnicianAvatar[] = [
  {
    id: "plumber",
    label: "Master Plumber",
    category: "Plumber",
    url: "/images/technicians/plumber.webp",
    badge: "Plumbing Expert",
    bgColor: "from-blue-50 to-cyan-100"
  },
  {
    id: "electrician",
    label: "Pro Electrician",
    category: "Electrician",
    url: "/images/technicians/electrician.webp",
    badge: "Wiring & Power",
    bgColor: "from-amber-50 to-yellow-100"
  },
  {
    id: "mason-worker",
    label: "Senior Mason",
    category: "Mason Worker",
    url: "/images/technicians/mason-worker.webp",
    badge: "Civil & Masonry",
    bgColor: "from-stone-100 to-orange-100"
  },
  {
    id: "painter",
    label: "Color & Finish Painter",
    category: "Painter",
    url: "/images/technicians/painter.webp",
    badge: "Home Painting",
    bgColor: "from-pink-50 to-rose-100"
  },
  {
    id: "welder",
    label: "Fabricator & Welder",
    category: "Welder",
    url: "/images/technicians/welder.webp",
    badge: "Grills & Steel",
    bgColor: "from-slate-100 to-orange-100"
  },
  {
    id: "carpenter",
    label: "Woodcraft Carpenter",
    category: "Carpenter",
    url: "/images/technicians/carpenter.webp",
    badge: "Modular & Wood",
    bgColor: "from-amber-50 to-amber-100"
  },
  {
    id: "civil-engineer",
    label: "Chartered Civil Engineer",
    category: "Civil Engineer",
    url: "/images/technicians/civil-engineer.webp",
    badge: "Site Plans & Design",
    bgColor: "from-indigo-50 to-blue-100"
  },
  {
    id: "others",
    label: "All-Round Site Specialist",
    category: "Others",
    url: "/images/technicians/others.webp",
    badge: "Site & Heavy Work",
    bgColor: "from-red-50 to-orange-100"
  }
];

export const AVAILABLE_SKILLS = [
  "Plumber",
  "Electrician",
  "Mason Worker",
  "Painter",
  "Welder",
  "Carpenter",
  "Civil Engineer",
  "Tile & Flooring Specialist",
  "False Ceiling & POP",
  "Waterproofing Expert",
  "AC & Appliance Repair",
  "Demolition & Core Cutting",
  "Construction Supervisor",
  "Fabrication Worker",
  "Borewell & Motor Specialist",
  "Others"
];

export const DISTANCE_OPTIONS = [
  { value: 10, label: "10 km (Local Area)" },
  { value: 25, label: "25 km (Standard City)" },
  { value: 40, label: "40 km (Extended District)" },
  { value: 60, label: "60 km (Cross-District)" }
];

export const WORKING_HOUR_OPTIONS = [
  "8:00 AM - 6:00 PM (Standard)",
  "9:00 AM - 8:00 PM (Extended Hours)",
  "7:00 AM - 4:00 PM (Early Shift)",
  "24/7 (Emergency Available)"
];

export const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

