"use client";

import { useActionState } from "react";
import { saveResult, type ResultState } from "@/app/(app)/admin/actions";
import { Flag } from "@/components/ui/Flag";

const initial: ResultState = {};

export interface ResultFormProps {
  matchNumber: number;
  kickoffLabel: string;
  homeLabel: string;
  awayLabel: string;
  homeIso: string;
  awayIso: string;
  finished: boolean;
  current: { home: number; away: number } | null;
}

export function ResultForm(props: ResultFormProps) {
  const [state, action, pending] = useActionState(saveResult, initial);

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">
          #{props.matchNumber} · {props.kickoffLabel}
        </span>
        {props.finished && (
          <span className="rounded-md bg-accent/15 px-2 py-0.5 font-semibold text-accent">
            Finalizado
          </span>
        )}
      </div>

      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="matchNumber" value={props.matchNumber} />

        <span className="flex flex-1 items-center justify-end gap-2 text-right text-sm font-semibold text-slate-100">
          {props.homeLabel} <Flag iso={props.homeIso} size={28} />
        </span>

        <input
          type="number"
          name="homeGoals"
          min={0}
          max={99}
          inputMode="numeric"
          aria-label={`Goles ${props.homeLabel}`}
          defaultValue={props.current?.home ?? ""}
          placeholder="–"
          className="w-14 rounded-xl border border-line bg-surface2 px-2 py-2 text-center font-display text-xl text-slate-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <span className="text-muted">–</span>
        <input
          type="number"
          name="awayGoals"
          min={0}
          max={99}
          inputMode="numeric"
          aria-label={`Goles ${props.awayLabel}`}
          defaultValue={props.current?.away ?? ""}
          placeholder="–"
          className="w-14 rounded-xl border border-line bg-surface2 px-2 py-2 text-center font-display text-xl text-slate-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />

        <span className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-100">
          <Flag iso={props.awayIso} size={28} /> {props.awayLabel}
        </span>

        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-ink transition hover:bg-primary-strong disabled:opacity-50"
        >
          {pending ? "…" : props.finished ? "Corregir" : "Guardar"}
        </button>
      </form>

      {state.error && <p className="text-xs text-red-300">{state.error}</p>}
      {state.ok && (
        <p className="text-xs font-semibold text-accent">
          Resultado guardado · {state.updated} pronósticos recalculados
        </p>
      )}
    </li>
  );
}
