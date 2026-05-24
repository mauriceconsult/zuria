// components/ui/dukaboda-logo.tsx
// Used on dukaboda.maxnovate.com landing page and admin

interface DukabodaLogoProps {
  variant?: "primary" | "white";
  size?: number;
  className?: string;
}

export function DukabodaLogo({
  variant = "primary",
  size = 40,
  className = "",
}: DukabodaLogoProps) {
  const circleColor = variant === "white" ? "#1e293b" : "#0f172a";
  const accentColor = variant === "white" ? "#93c5fd" : "#0286ff";
  const bodyColor = variant === "white" ? "#93c5fd" : "#0286ff";
  const textPrimary = variant === "white" ? "white" : "#0f172a";
  const textAccent = variant === "white" ? "#93c5fd" : "#0286ff";

  const wordmarkSize = Math.round(size * 0.65);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Rider icon mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="20" fill={circleColor} />
        {/* Scooter body */}
        <ellipse
          cx="20"
          cy="28"
          rx="13"
          ry="5"
          stroke={bodyColor}
          strokeWidth="2.5"
          fill="none"
        />
        {/* Wheels */}
        <circle
          cx="10"
          cy="31"
          r="4"
          stroke={bodyColor}
          strokeWidth="2"
          fill="none"
        />
        <circle
          cx="30"
          cy="31"
          r="4"
          stroke={bodyColor}
          strokeWidth="2"
          fill="none"
        />
        {/* Rider head */}
        <circle cx="27" cy="16" r="5" fill={accentColor} />
        {/* Speed lines */}
        <line
          x1="3"
          y1="20"
          x2="9"
          y2="20"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="25"
          x2="7"
          y2="25"
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="4"
          y1="15"
          x2="8"
          y2="15"
          stroke={accentColor}
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>

      {/* Wordmark */}
      <span
        style={{ fontSize: wordmarkSize, lineHeight: 1 }}
        className="font-black tracking-tight select-none"
        aria-label="Dukaboda"
      >
        <span style={{ color: textPrimary }}>Duka</span>
        <span style={{ color: textAccent }}>boda</span>
      </span>
    </div>
  );
}

export default DukabodaLogo;
