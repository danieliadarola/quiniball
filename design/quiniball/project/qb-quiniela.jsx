// qb-quiniela.jsx — pantalla de quiniela (partidos 1X2 + estrella + ranking) y modales
const { useState: useStateQ } = React;

/* ─── Botonera 1 · X · 2 ─────────────────────────────────── */
function PickButtons({ match, pick, onPick }) {
  const finished = match.status === 'finished';
  const opts = [
    { k: '1', label: 'Local' },
    { k: 'X', label: 'Empate' },
    { k: '2', label: 'Visit.' },
  ];
  return (
    <div className="qb-pick">
      {opts.map(o => {
        let cls = 'qb-pick-btn';
        if (finished) {
          if (o.k === match.result) cls += ' is-correct';
          if (pick === o.k && pick !== match.result) cls += ' is-wrong';
          if (pick !== o.k && o.k !== match.result) cls += ' is-dim';
        } else if (pick === o.k) {
          cls += ' is-sel';
        }
        return (
          <button key={o.k} className={cls} disabled={finished}
            onClick={() => onPick(match.id, o.k)}>
            <span className="qb-pick-k">{o.k}</span>
            <span className="qb-pick-l">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Tarjeta de partido ─────────────────────────────────── */
function MatchCard({ match, pick, exact, onPick, onExact }) {
  const finished = match.status === 'finished';
  // puntos ganados (si finished)
  let pts = null;
  if (finished && pick) {
    if (pick === match.result) pts = match.star ? (exact && exact[0] === match.score[0] && exact[1] === match.score[1] ? 6 : 3) : 3;
    else pts = 0;
  }
  return (
    <div className={`qb-match ${match.star ? 'is-star' : ''} ${finished ? 'is-done' : ''}`}>
      {match.star && (
        <div className="qb-star-ribbon">
          <svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.6L12 17.3 5.9 20.6l1.5-6.6L2.3 8.9l6.8-.6z" /></svg>
          Partido estrella · marcador exacto <b>+6 pts</b>
        </div>
      )}
      <div className="qb-match-head">
        <span className="qb-match-grp">{match.group}</span>
        {finished
          ? <span className="qb-match-final">Final {match.score[0]}–{match.score[1]}</span>
          : <span className="qb-match-time">{match.time}</span>}
      </div>

      <div className="qb-match-teams">
        <div className="qb-team">
          <FlagBadge code={match.home.code} />
          <span className="qb-team-name">{match.home.name}</span>
        </div>
        <span className="qb-vs">{finished ? `${match.score[0]} : ${match.score[1]}` : 'vs'}</span>
        <div className="qb-team qb-team-r">
          <span className="qb-team-name">{match.away.name}</span>
          <FlagBadge code={match.away.code} />
        </div>
      </div>

      <PickButtons match={match} pick={pick} onPick={onPick} />

      {/* Marcador exacto del partido estrella */}
      {match.star && !finished && (
        <div className="qb-exact">
          <div className="qb-exact-head">
            <span>Marcador exacto <em>(opcional)</em></span>
            <span className="qb-exact-pts">+6 pts si aciertas</span>
          </div>
          <div className="qb-exact-row">
            <div className="qb-exact-team">
              <FlagBadge code={match.home.code} size={28} />
              <Stepper value={exact ? exact[0] : 0} onChange={v => onExact(match.id, [v, exact ? exact[1] : 0])} />
            </div>
            <span className="qb-exact-dash">–</span>
            <div className="qb-exact-team">
              <Stepper value={exact ? exact[1] : 0} onChange={v => onExact(match.id, [exact ? exact[0] : 0, v])} />
              <FlagBadge code={match.away.code} size={28} />
            </div>
          </div>
        </div>
      )}

      {finished && pts !== null && (
        <div className={`qb-result-bar ${pts > 0 ? 'win' : 'lose'}`}>
          {pts > 0
            ? <>Acertaste <b>+{pts} pts</b></>
            : <>Fallaste <b>0 pts</b></>}
        </div>
      )}
    </div>
  );
}

/* ─── Banner de jornada (bloques de color) ───────────────── */
function JornadaBanner({ j }) {
  return (
    <div className="qb-jbanner" style={{ '--c': j.color, '--a': j.accent }}>
      <span className="qb-jb-block jb1" />
      <span className="qb-jb-block jb2" />
      <span className="qb-jb-block jb3" />
      <div className="qb-jb-text">
        <h3 className="qb-jb-title">{j.label}</h3>
        <span className="qb-jb-date">{j.dateLabel}</span>
        <span className={`qb-jb-count ${j.locked ? '' : 'live'}`}>
          {!j.locked && <span className="qb-jb-livedot" />}{j.countdown}
        </span>
      </div>
    </div>
  );
}

/* ─── Ranking ────────────────────────────────────────────── */
function RankingList() {
  return (
    <div className="qb-ranking">
      {RANKING.map((r, i) => (
        <div key={r.name} className={`qb-rank-row ${r.you ? 'is-you' : ''} ${i < 3 ? 'is-podium' : ''}`}>
          <span className={`qb-rank-pos p${i + 1}`}>{i + 1}</span>
          <div className="qb-rank-id">
            <span className="qb-rank-av">{r.name === 'Tú' ? '★' : r.name[0]}</span>
            <div>
              <span className="qb-rank-name">{r.name}</span>
              <span className="qb-rank-sub">{r.hits} aciertos · {r.exact} exactos</span>
            </div>
          </div>
          <span className="qb-rank-pts">{r.pts}<small>pts</small></span>
        </div>
      ))}
    </div>
  );
}

/* ─── Pantalla de quiniela ───────────────────────────────── */
function QuinielaScreen({ quiniela, onBack, picks, onPick, onExact }) {
  const [tab, setTab] = useStateQ('partidos');
  const [jid, setJid] = useStateQ(1);
  const j = JORNADAS.find(x => x.id === jid);

  return (
    <div className="qb-screen qb-quiniela">
      <header className="qb-qhead" style={{ '--c': quiniela.color }}>
        <button className="qb-back" onClick={onBack} aria-label="volver">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className="qb-qhead-mid">
          <h2 className="qb-qhead-name">{quiniela.name}</h2>
          <span className="qb-qhead-code">Código {quiniela.code}</span>
        </div>
        <div className="qb-qhead-me">
          <span className="qb-qhead-rank">#{quiniela.myRank}</span>
          <span className="qb-qhead-pts">{quiniela.myPoints} pts</span>
        </div>
      </header>

      <div className="qb-tabs">
        <button className={tab === 'partidos' ? 'on' : ''} onClick={() => setTab('partidos')}>Partidos</button>
        <button className={tab === 'ranking' ? 'on' : ''} onClick={() => setTab('ranking')}>Ranking</button>
      </div>

      {tab === 'partidos' && (
        <div className="qb-q-content">
          <div className="qb-jchips">
            {JORNADAS.map(x => (
              <button key={x.id} className={`qb-jchip ${x.id === jid ? 'on' : ''}`} onClick={() => setJid(x.id)}>
                J{x.id}
              </button>
            ))}
          </div>

          <JornadaBanner j={j} />

          {j.matches.length === 0 ? (
            <div className="qb-empty">
              <svg viewBox="0 0 24 24" width="30" height="30"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              <p>Jornada bloqueada</p>
              <span>Los partidos se abren cuando termine la jornada anterior.</span>
            </div>
          ) : (
            <div className="qb-match-list">
              {j.matches.map(m => (
                <MatchCard key={m.id} match={m}
                  pick={picks[m.id] && picks[m.id].pick}
                  exact={picks[m.id] && picks[m.id].exact}
                  onPick={onPick} onExact={onExact} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ranking' && (
        <div className="qb-q-content">
          <RankingList />
        </div>
      )}
    </div>
  );
}

/* ─── Modales: crear / unirse ────────────────────────────── */
function Modal({ children, onClose }) {
  return (
    <div className="qb-modal-scrim" onClick={onClose}>
      <div className="qb-modal" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function CreateModal({ onClose }) {
  const [name, setName] = useStateQ('');
  const code = 'QB-' + (Math.floor(1000 + Math.random() * 9000));
  return (
    <Modal onClose={onClose}>
      <h3 className="qb-modal-title">Crear quiniela</h3>
      <label className="qb-label">Nombre del grupo</label>
      <input className="qb-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Compañeros de la uni" />
      <div className="qb-codecard">
        <span className="qb-label">Código para invitar</span>
        <span className="qb-codeval">{code}</span>
        <span className="qb-code-hint">Compártelo para que se unan</span>
      </div>
      <button className={`qb-btn qb-btn-primary qb-btn-block ${name ? '' : 'is-off'}`} onClick={onClose}>Crear quiniela</button>
    </Modal>
  );
}

function JoinModal({ onClose }) {
  const [code, setCode] = useStateQ('');
  return (
    <Modal onClose={onClose}>
      <h3 className="qb-modal-title">Unirme con código</h3>
      <label className="qb-label">Código de la quiniela</label>
      <input className="qb-input qb-input-code" value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} placeholder="QB-1234" />
      <p className="qb-join-hint">Pídele el código al organizador del grupo.</p>
      <button className={`qb-btn qb-btn-primary qb-btn-block ${code.length >= 4 ? '' : 'is-off'}`} onClick={onClose}>Unirme</button>
    </Modal>
  );
}

Object.assign(window, { QuinielaScreen, CreateModal, JoinModal });
