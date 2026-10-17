//import logoAsset from "@/assets/LaCocinaDeOriente.png.asset.json";
import logoUrl from '@/assets/LaCocinaDeOriente.png';

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dimensions =
    size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : size === "sm" ? "h-11 w-11" : "h-14 w-14";

  return (
    <img
      src={logoUrl}
      alt="La Cocina de Oriente"
      className={`shrink-0 object-contain ${dimensions}`}
    />
  );
}
