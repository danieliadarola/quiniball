// qb-screens.jsx — pantallas y modales de QuiniBall
const { useState, useEffect, useRef } = React;

/* ════════════════════════════════════════════════════════════
   1 · ENTRADA  (email + PIN de 4 dígitos)
   ════════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('alex@correo.com');
  const [pin, setPin] = useState(['', '', '', '']);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const setDigit = (i, v) => {
    v = v.replace(/\D/g, '').slice(-1);
    const next = [...pin]; next[i] = v; setPin(next);
    if (v && i < 3) refs[i + 1].current && refs[i + 1].current.focus();
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) refs[i - 1].current.focus();
  };
  const ready = email.includes('@') && pin.every(d => d !== '');

  return (
    <div className="qb-screen qb-login">
      <div className="qb-login-glow" />
      <div className="qb-login-top">
        <QBLogo size="lg" />
        <div className="qb-login-hero">
          <span className="qb-kicker">Predicciones del Mundial</span>
          <h1 className="qb-display">Acierta cada<br />jornada y sube<br />en el ranking</h1>
          <p className="qb-login-sub">Pronostica 1·X·2 en cada partido, gana puntos y compite con tu grupo. Sin dinero, solo gloria.</p>
        </div>
      </div>

      <div className="qb-login-form">
        <label className="qb-label">Correo</label>
        <input className="qb-input" type="email" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />

        <label className="qb-label">PIN de acceso</label>
        <div className="qb-pin">
          {pin.map((d, i) => (
            <input key={i} ref={refs[i]} className="qb-pin-box" inputMode="numeric"
              value={d} onChange={e => setDigit(i, e.target.value)}
              onKeyDown={e => onKey(i, e)} maxLength={1} />
          ))}
        </div>

        <button className={`qb-btn qb-btn-primary qb-btn-block ${ready ? '' : 'is-off'}`}
          onClick={onLogin}>Entrar</button>
        <p className="qb-login-foot">¿Sin cuenta? <b>Crear con email y PIN</b></p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   2 · INICIO  (mis quinielas + crear + unirme)
   ════════════════════════════════════════════════════════════ */
function HomeScreen({ onOpen, onCreate, onJoin }) {
  const totalPts = MY_QUINIELAS.reduce((s, q) => s + q.myPoints, 0);
  return (
    <div className="qb-screen qb-home">
      <header className="qb-topbar">
        <QBLogo />
        <button className="qb-icon-btn" aria-label="menú">
          <span /><span /><span />
        </button>
      </header>

      <div className="qb-home-hello">
        <div>
          <span className="qb-hello-k">Hola,</span>
          <h2 className="qb-hello-name">Álex</h2>
        </div>
        <div className="qb-pts-chip">
          <span className="qb-pts-num">{totalPts}</span>
          <span className="qb-pts-lbl">pts totales</span>
        </div>
      </div>

      <div className="qb-section-head">
        <h3>Mis quinielas</h3>
        <span className="qb-count">{MY_QUINIELAS.length}</span>
      </div>

      <div className="qb-q-list">
        {MY_QUINIELAS.map(q => (
          <button key={q.id} className="qb-q-card" onClick={() => onOpen(q)}>
            <span className="qb-q-bar" style={{ '--c': q.color, '--a': q.accent }}>
              <span className="qb-q-block b1" />
              <span className="qb-q-block b2" />
              <span className="qb-q-block b3" />
            </span>
            <div className="qb-q-body">
              <div className="qb-q-row1">
                <h4 className="qb-q-name">{q.name}</h4>
                {q.pending > 0 && <span className="qb-q-pending">{q.pending} pend.</span>}
              </div>
              <div className="qb-q-meta">
                <span className="qb-q-rank" style={{ '--c': q.color }}>#{q.myRank}<small>/{q.totalRanks}</small></span>
                <span className="qb-dot" />
                <span>{q.members} jugadores</span>
                <span className="qb-dot" />
                <span className="qb-q-mypts">{q.myPoints} pts</span>
              </div>
              <div className="qb-q-next">
                <span className="qb-live-dot" />
                <span className="qb-q-next-txt">Próximo · {q.next}</span>
                <b>{q.nextTime}</b>
              </div>
            </div>
            <svg className="qb-q-arrow" viewBox="0 0 24 24" width="20" height="20"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        ))}
      </div>

      <div className="qb-home-actions">
        <button className="qb-btn qb-btn-primary qb-btn-block" onClick={onCreate}>
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5v14M5 12h14" /></svg>
          Crear quiniela
        </button>
        <button className="qb-btn qb-btn-ghost qb-btn-block" onClick={onJoin}>
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" /></svg>
          Unirme con código
        </button>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
window.HomeScreen = HomeScreen;
