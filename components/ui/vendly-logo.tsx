// components/ui/vendly-logo.tsx
// Shared logo component for Vendly storefront and Zuria dashboard
// Usage:
//   <VendlyLogo />                    — full logo, default size
//   <VendlyLogo variant="icon" />     — icon mark only
//   <VendlyLogo variant="white" />    — white version for dark backgrounds
//   <VendlyLogo size={48} />          — custom icon size

interface VendlyLogoProps {
  variant?: "primary" | "white" | "icon";
  size?: number; // icon height in px — wordmark scales proportionally
  className?: string;
}

export function VendlyLogo({
  variant = "primary",
  size = 40,
  className = "",
}: VendlyLogoProps) {
  const bagColor = variant === "white" ? "white" : "#0286ff";
  const handleColor = variant === "white" ? "white" : "#0286ff";
  const checkColor = variant === "white" ? "#0286ff" : "white";
  const textPrimary = variant === "white" ? "white" : "#0f172a";
  const textAccent = variant === "white" ? "#60b0ff" : "#0286ff";

  const h = size;
  const w = Math.round(h * 0.8); // icon aspect ratio
  const rx = Math.round(h * 0.15);
  const sw = Math.round(h * 0.09); // stroke width

  if (variant === "icon") {
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Vendly"
        role="img"
      >
        <rect
          x={0}
          y={Math.round(h * 0.28)}
          width={w}
          height={Math.round(h * 0.72)}
          rx={rx}
          fill={bagColor}
        />
        <path
          d={`M${Math.round(w * 0.28)} ${Math.round(h * 0.28)} Q${Math.round(w * 0.28)} ${Math.round(h * 0.06)} ${Math.round(w * 0.5)} ${Math.round(h * 0.06)} Q${Math.round(w * 0.72)} ${Math.round(h * 0.06)} ${Math.round(w * 0.72)} ${Math.round(h * 0.28)}`}
          stroke={handleColor}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${Math.round(w * 0.18)} ${Math.round(h * 0.58)} L${Math.round(w * 0.5)} ${Math.round(h * 0.88)} L${Math.round(w * 0.82)} ${Math.round(h * 0.58)}`}
          stroke={checkColor}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const wordmarkSize = Math.round(h * 0.7);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon mark */}
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x={0}
          y={Math.round(h * 0.28)}
          width={w}
          height={Math.round(h * 0.72)}
          rx={rx}
          fill={bagColor}
        />
        <path
          d={`M${Math.round(w * 0.28)} ${Math.round(h * 0.28)} Q${Math.round(w * 0.28)} ${Math.round(h * 0.06)} ${Math.round(w * 0.5)} ${Math.round(h * 0.06)} Q${Math.round(w * 0.72)} ${Math.round(h * 0.06)} ${Math.round(w * 0.72)} ${Math.round(h * 0.28)}`}
          stroke={handleColor}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${Math.round(w * 0.18)} ${Math.round(h * 0.58)} L${Math.round(w * 0.5)} ${Math.round(h * 0.88)} L${Math.round(w * 0.82)} ${Math.round(h * 0.58)}`}
          stroke={checkColor}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark */}
      <span
        style={{ fontSize: wordmarkSize, lineHeight: 1 }}
        className="font-black tracking-tight select-none"
        aria-label="Vendly"
      >
        <span style={{ color: textPrimary }}>Vend</span>
        <span style={{ color: textAccent }}>ly</span>
      </span>
    </div>
  );
}

export default VendlyLogo;
