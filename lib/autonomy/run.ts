/**
 * Autonomie-runner — de standaard manier om een geautomatiseerde actie uit te
 * voeren. Routeert door {@link decideAction}, voert alleen uit bij `execute`,
 * legt bij `propose` de keuze aan de mens voor, blokkeert bij `block`, en logt
 * áltijd (wie/wat/waarom/wanneer) — het audit-spoor.
 *
 * De IO-effecten (uitvoeren, voorleggen, loggen) worden geïnjecteerd, zodat de
 * orkestratie puur en testbaar blijft. Geen agent muteert nog rechtstreeks:
 * alles loopt hierdoorheen.
 */

import {
  decideAction,
  type AgentAction,
  type DispatchContext,
  type DispatchResult,
} from "./dispatcher";

export interface AgentLogEntry<T> {
  action: AgentAction;
  decision: DispatchResult;
  executed: boolean;
  result?: T;
  /** ISO-tijdstip van het besluit. */
  at: string;
}

export interface AgentEffects<T> {
  /** Voert de muterende actie uit (alleen bij `execute`). */
  onExecute: () => Promise<T>;
  /** Legt de actie aan de mens voor (bij `propose`) — bv. een Nu-doen-kaart. */
  onPropose?: (action: AgentAction, decision: DispatchResult) => Promise<void> | void;
  /** Verwerkt een blokkade (bij `block`) — bv. escaleren/markeren. */
  onBlock?: (action: AgentAction, decision: DispatchResult) => Promise<void> | void;
  /** Altijd aangeroepen: het audit-spoor. */
  onLog?: (entry: AgentLogEntry<T>) => Promise<void> | void;
}

export interface AgentRunResult<T> {
  decision: DispatchResult;
  executed: boolean;
  result?: T;
}

export async function runAgentAction<T>(
  action: AgentAction,
  ctx: DispatchContext,
  effects: AgentEffects<T>,
): Promise<AgentRunResult<T>> {
  const decision = decideAction(action, ctx);

  let executed = false;
  let result: T | undefined;

  if (decision.decision === "execute") {
    result = await effects.onExecute();
    executed = true;
  } else if (decision.decision === "propose") {
    await effects.onPropose?.(action, decision);
  } else {
    await effects.onBlock?.(action, decision);
  }

  await effects.onLog?.({ action, decision, executed, result, at: new Date().toISOString() });

  return { decision, executed, result };
}
