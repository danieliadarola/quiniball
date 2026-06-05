-- =============================================================================
-- Mundial 2026 · Quinielas — 0005: Cierre de pronósticos 5 min antes del inicio
-- =============================================================================
-- Regla de negocio: el pronóstico (1X2 normal o marcador del partido de la
-- jornada) se cierra 5 MINUTOS ANTES del kickoff, no en el kickoff. La capa de
-- código (src/lib/matches/schedule.ts: PREDICTION_LOCK_LEAD_MS) replica esto;
-- aquí lo reforzamos en la RLS (defensa en profundidad).
--
-- Además, las predicciones AJENAS se revelan en ese mismo instante de cierre
-- (cuando ya nadie puede cambiarlas), no en el kickoff.
-- =============================================================================

-- --- predictions: SELECT (ver ajenas) --------------------------------------
drop policy if exists "predictions_select" on predictions;
create policy "predictions_select" on predictions for select using (
  profile_id = auth.uid()
  or (
    is_group_member(group_id)
    and exists (
      select 1 from matches m
      where m.match_number = predictions.match_number
        and m.kickoff_at - interval '5 minutes' <= now()
    )
  )
);

-- --- predictions: INSERT -----------------------------------------------------
drop policy if exists "predictions_insert" on predictions;
create policy "predictions_insert" on predictions for insert with check (
  profile_id = auth.uid()
  and is_group_member(group_id)
  and exists (
    select 1 from matches m
    where m.match_number = predictions.match_number
      and now() < m.kickoff_at - interval '5 minutes'
  )
);

-- --- predictions: UPDATE -----------------------------------------------------
drop policy if exists "predictions_update" on predictions;
create policy "predictions_update" on predictions for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.match_number = predictions.match_number
        and now() < m.kickoff_at - interval '5 minutes'
    )
  );
