export const BUSINESS_CATEGORIES = [
  { name: "Restaurant / Café", image: "/category-images/restaurant-cafe.jpg", source: "https://unsplash.com/s/photos/restaurant-interior" },
  { name: "Beauty / Salon", image: "/category-images/beauty-salon.jpg", source: "https://unsplash.com/s/photos/beauty-salon" },
  { name: "Retail / Shop", image: "/category-images/retail.jpg", source: "https://unsplash.com/s/photos/retail-store" },
  { name: "Fitness", image: "/category-images/fitness.jpg", source: "https://unsplash.com/s/photos/fitness-gym" },
  { name: "Health / Wellness", image: "/category-images/health-wellness.jpg", source: "https://unsplash.com/s/photos/health-wellness" },
  { name: "Home Services", image: "/category-images/home-services.jpg", source: "https://unsplash.com/s/photos/home-cleaning" },
  { name: "Professional Services", image: "/category-images/professional-services.jpg", source: "https://unsplash.com/s/photos/professional-office" },
  { name: "Automotive", image: "/category-images/automotive.jpg", source: "https://unsplash.com/s/photos/auto-repair" },
  { name: "Pet Services", image: "/category-images/pet-services.jpg", source: "https://unsplash.com/s/photos/pet-grooming" },
  { name: "Other", image: "/category-images/other.jpg", source: "https://unsplash.com/s/photos/small-business" },
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]["name"];

export function isBusinessCategory(value: string): value is BusinessCategory {
  return BUSINESS_CATEGORIES.some((category) => category.name === value);
}

export function getBusinessCategory(value: string | null | undefined) {
  const exact = BUSINESS_CATEGORIES.find((category) => category.name === value);
  if (exact) return exact;

  const legacy = value?.toLowerCase() ?? "";
  const aliases: Array<[number, string[]]> = [
    [0, ["restaurant", "cafe", "café", "food", "bakery", "brunch"]],
    [1, ["beauty", "salon", "hair", "nail", "spa"]],
    [2, ["retail", "shop", "store", "boutique", "florist"]],
    [3, ["fitness", "gym", "workout"]],
    [4, ["health", "wellness", "clinic", "medical", "dental"]],
    [5, ["home", "clean", "plumb", "electric", "repair"]],
    [6, ["professional", "legal", "account", "estate", "agency", "consult"]],
    [7, ["auto", "car", "mechanic"]],
    [8, ["pet", "vet", "groom"]],
  ];
  const match = aliases.find(([, words]) => words.some((word) => legacy.includes(word)));
  return BUSINESS_CATEGORIES[match?.[0] ?? BUSINESS_CATEGORIES.length - 1];
}
