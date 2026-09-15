export const BUSINESS_CATEGORIES = [
  { name: "Restaurant / Café", image: "/category-icons/restaurant-cafe.png" },
  { name: "Beauty / Salon", image: "/category-icons/beauty-salon.png" },
  { name: "Retail / Shop", image: "/category-icons/retail-shop.png" },
  { name: "Fitness / Sports", image: "/category-icons/fitness-sports.png" },
  { name: "Health / Wellness", image: "/category-icons/health-wellness.png" },
  { name: "Medical / Dental", image: "/category-icons/medical-dental.png" },
  { name: "Home Services", image: "/category-icons/home-services.png" },
  { name: "Professional Services", image: "/category-icons/professional-services.png" },
  { name: "Automotive", image: "/category-icons/automotive.png" },
  { name: "Pet Services", image: "/category-icons/pet-services.png" },
  { name: "Education / Tutoring", image: "/category-icons/education-tutoring.png" },
  { name: "Real Estate", image: "/category-icons/real-estate.png" },
  { name: "Hotel / Travel", image: "/category-icons/hotel-travel.png" },
  { name: "Arts / Entertainment", image: "/category-icons/arts-entertainment.png" },
  { name: "Other", image: "/category-icons/other.png" },
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]["name"];

export function isBusinessCategory(value: string): value is BusinessCategory {
  return BUSINESS_CATEGORIES.some((category) => category.name === value);
}

export function getBusinessCategory(value: string | null | undefined) {
  const exact = BUSINESS_CATEGORIES.find((category) => category.name === value);
  if (exact) return exact;

  const legacy = value?.toLowerCase() ?? "";
  const aliases: Array<[BusinessCategory, string[]]> = [
    ["Restaurant / Café", ["restaurant", "cafe", "café", "food", "bakery", "brunch", "bar", "drink"]],
    ["Beauty / Salon", ["beauty", "salon", "hair", "nail", "spa", "barber"]],
    ["Retail / Shop", ["retail", "shop", "store", "boutique", "florist", "flower"]],
    ["Fitness / Sports", ["fitness", "gym", "workout", "sport", "yoga", "pilates"]],
    ["Medical / Dental", ["clinic", "medical", "dental", "dentist", "doctor", "pharmacy"]],
    ["Health / Wellness", ["health", "wellness", "massage", "therapy", "nutrition"]],
    ["Home Services", ["home", "clean", "plumb", "electric", "repair", "construction", "moving"]],
    ["Professional Services", ["professional", "legal", "account", "finance", "insurance", "agency", "consult"]],
    ["Automotive", ["auto", "car", "mechanic", "motor", "vehicle"]],
    ["Pet Services", ["pet", "vet", "groom", "animal"]],
    ["Education / Tutoring", ["education", "school", "tutor", "learn", "training", "language"]],
    ["Real Estate", ["real estate", "property", "realtor", "housing"]],
    ["Hotel / Travel", ["hotel", "hostel", "travel", "tour", "accommodation", "lodging"]],
    ["Arts / Entertainment", ["art", "music", "entertainment", "cinema", "game", "event", "photo"]],
  ];
  const match = aliases.find(([, words]) => words.some((word) => legacy.includes(word)));
  return BUSINESS_CATEGORIES.find((category) => category.name === match?.[0]) ?? BUSINESS_CATEGORIES.at(-1)!;
}
