// qb-components.jsx — átomos visuales compartidos de QuiniBall
// Estilos viven en QuiniBall.html (clases .qb-*). Aquí solo estructura.

// Emblema original (diana = "acierta" + balón). Solo formas simples.
function QBLogo({ size = 'md', mono = false }) {
  const px = size === 'lg' ? 40 : size === 'sm' ? 24 : 30;
  return (
    <div className={`qb-logo ${mono ? 'is-mono' : ''}`}>
      <span className="qb-emblem" style={{ width: px, height: px }}>
        <svg viewBox="0 0 40 40" width={px} height={px} aria-hidden="true">
          <circle cx="20" cy="20" r="19" className="qb-em-ring" />
          <circle cx="20" cy="20" r="12" className="qb-em-mid" />
          <circle cx="20" cy="20" r="5" className="qb-em-dot" />
        </svg>
      </span>
      <span className="qb-word">Quini<b>Ball</b></span>
    </div>
  );
}

// Banderín (pennant) grande — pantalla de marcador exacto
function Pennant({ code, name }) {
  return (
    <div className="qb-pennant-wrap">
      <span className="qb-pennant" style={{ backgroundImage: `url(${FLAG(code)})` }} />
      <span className="qb-pennant-name">{name}</span>
    </div>
  );
}

// Bandera redonda pequeña — filas de partido
function FlagBadge({ code, size = 34 }) {
  return (
    <span
      className="qb-flag"
      style={{ width: size, height: size, backgroundImage: `url(${FLAG(code)})` }}
    />
  );
}

// Stepper de marcador (chevrons lima, como el mockup)
function Stepper({ value, onChange, disabled }) {
  return (
    <div className={`qb-stepper ${disabled ? 'is-disabled' : ''}`}>
      <button className="qb-step-btn" disabled={disabled}
        onClick={() => onChange(Math.min(9, value + 1))} aria-label="subir">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 15l6-6 6 6" /></svg>
      </button>
      <span className="qb-step-num">{value}</span>
      <button className="qb-step-btn" disabled={disabled}
        onClick={() => onChange(Math.max(0, value - 1))} aria-label="bajar">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    </div>
  );
}

Object.assign(window, { QBLogo, Pennant, FlagBadge, Stepper });
