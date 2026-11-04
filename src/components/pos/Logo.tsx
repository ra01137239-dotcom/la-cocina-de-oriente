
import logoUrl from "@/assets/LaCocinaDeOriente.png";

export function Logo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "lg"
      ? "h-24 w-24 sm:h-28 sm:w-28"
      : size === "sm"
        ? "h-11 w-11"
        : "h-14 w-14";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${dimensions}`}
    >
      <img
        src={logoUrl}
        alt="La Cocina de Oriente"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
