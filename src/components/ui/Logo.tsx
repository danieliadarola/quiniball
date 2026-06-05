/**
 * Emblema + wordmark de QuiniBall. La "diana" (acierta) combina anillo primario,
 * anillo de acento y centro relleno. Sin dependencias; solo SVG.
 */
export function Logo({
  size = 30,
  mono = false,
  className = "",
}: {
  size?: number;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="inline-flex shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
          <circle cx="20" cy="20" r="19" fill="none" stroke="var(--logo-ring,#1F8A5B)" strokeWidth="3" />
          <circle cx="20" cy="20" r="12" fill="none" stroke="var(--logo-mid,#facc15)" strokeWidth="3" />
          <circle cx="20" cy="20" r="5" fill="var(--logo-ring,#1F8A5B)" />
        </svg>
      </span>
      <span
        className="font-display text-[22px] font-bold italic uppercase tracking-[0.4px]"
        style={{ fontStyle: "italic" }}
      >
        Quini<b className={`font-extrabold ${mono ? "" : "text-primary"}`}>Ball</b>
      </span>
    </div>
  );
}
