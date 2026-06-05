/**
 * Bandera circular de una selección, a partir de su código ISO (flag-icons).
 * SVG offline: nítida y sin depender de internet (ideal PWA/app).
 */
export function Flag({
  iso,
  size = 28,
  className = "",
}: {
  iso?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  if (!iso) {
    return (
      <span className={`flag-circle ${className}`} style={style} aria-hidden>
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-muted">
          ?
        </span>
      </span>
    );
  }

  return (
    <span className={`flag-circle ${className}`} style={style} role="img">
      <span className={`fi fi-${iso} fis`} />
    </span>
  );
}
