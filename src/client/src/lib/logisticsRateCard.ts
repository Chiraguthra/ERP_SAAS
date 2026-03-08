/**
 * Logistics rate card (Jabalpur origin).
 * Rows = distance (local or km bands), Columns = weight in kg.
 * Rate is per kg; total = weight * rate.
 */
const WEIGHT_BANDS = [
  { min: 0, max: 1000, label: "0-1000" },
  { min: 1001, max: 3000, label: "1001-3000" },
  { min: 3001, max: 5000, label: "3001-5000" },
  { min: 5001, max: 7500, label: "5001-7500" },
] as const;

const DISTANCE_BANDS = [
  { key: "local", label: "Local", minKm: null, maxKm: null },
  { key: "0-120", label: "0-120 km", minKm: 0, maxKm: 120 },
  { key: "120-240", label: "120-240 km", minKm: 120, maxKm: 240 },
  { key: "240-360", label: "240-360 km", minKm: 240, maxKm: 360 },
  { key: "360-480", label: "360-480 km", minKm: 360, maxKm: 480 },
] as const;

/** Rate per kg: [distanceKey][weightBandIndex] */
const RATE_CARD: Record<string, number[]> = {
  local: [0.77, 0.5, 0.5, 0.5],
  "0-120": [2.25, 1.8, 1.58, 1.35],
  "120-240": [2.48, 2.25, 2.03, 1.8],
  "240-360": [2.93, 2.7, 2.48, 2.25],
  "360-480": [4.05, 3.38, 2.93, 2.7],
};

function getWeightBandIndex(weightKg: number): number | null {
  if (weightKg < 0) return null;
  const i = WEIGHT_BANDS.findIndex((b) => weightKg >= b.min && weightKg <= b.max);
  return i >= 0 ? i : null;
}

function getDistanceKey(isLocal: boolean, distanceKm: number): string | null {
  if (isLocal) return "local";
  if (distanceKm < 0) return null;
  const band = DISTANCE_BANDS.find(
    (b) => b.minKm != null && b.maxKm != null && distanceKm >= b.minKm! && distanceKm <= b.maxKm!
  );
  return band?.key ?? null;
}

export type RateEnquiryResult = {
  ratePerKg: number;
  weightKg: number;
  total: number;
  distanceLabel: string;
  weightLabel: string;
  valid: true;
} | {
  valid: false;
  error: string;
};

export function calculateLogisticsRate(
  isLocal: boolean,
  distanceKm: number,
  weightKg: number
): RateEnquiryResult {
  if (weightKg <= 0) {
    return { valid: false, error: "Weight must be greater than 0 kg." };
  }
  if (weightKg > 7500) {
    return { valid: false, error: "Weight exceeds 7500 kg. Rate card supports up to 5001-7500 kg." };
  }
  const weightIndex = getWeightBandIndex(weightKg);
  if (weightIndex === null) {
    return { valid: false, error: "Weight out of range." };
  }
  const distanceKey = getDistanceKey(isLocal, distanceKm);
  if (distanceKey === null && !isLocal) {
    return { valid: false, error: "Distance must be between 0 and 480 km, or select Local." };
  }
  const rates = RATE_CARD[distanceKey ?? "local"];
  const ratePerKg = rates[weightIndex];
  const distanceLabel = isLocal ? "Local" : DISTANCE_BANDS.find((b) => b.key === distanceKey)?.label ?? `${distanceKm} km`;
  const weightLabel = WEIGHT_BANDS[weightIndex].label;
  const totalRounded = Math.round(weightKg * ratePerKg);
  return {
    valid: true,
    ratePerKg,
    weightKg,
    total: totalRounded,
    distanceLabel,
    weightLabel,
  };
}

export { WEIGHT_BANDS, DISTANCE_BANDS, RATE_CARD };
