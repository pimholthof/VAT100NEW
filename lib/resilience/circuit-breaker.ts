/**
 * Circuit Breaker voor externe services (Tink, Anthropic, etc.)
 *
 * In-memory circuit breaker die voorkomt dat bij een service-outage
 * elke connectie een timeout veroorzaakt en het Vercel time-limit bereikt.
 *
 * States: CLOSED (normaal) → OPEN (skip calls) → HALF_OPEN (test met 1 call)
 */

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minuten cooldown

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half_open";
}

const circuits = new Map<string, CircuitState>();

function getCircuit(service: string): CircuitState {
  if (!circuits.has(service)) {
    circuits.set(service, { failures: 0, lastFailure: 0, state: "closed" });
  }
  return circuits.get(service)!;
}

/**
 * Check of een service beschikbaar is.
 * Retourneert false als de circuit open is (service is down).
 */
export function isServiceAvailable(service: string): boolean {
  const circuit = getCircuit(service);

  if (circuit.state === "closed") return true;

  if (circuit.state === "open") {
    // Check of cooldown voorbij is
    if (Date.now() - circuit.lastFailure >= COOLDOWN_MS) {
      circuit.state = "half_open";
      return true; // Sta 1 test-call toe
    }
    return false;
  }

  // half_open: laat 1 call door
  return true;
}

/**
 * Registreer een succesvolle call. Reset de circuit.
 */
export function recordSuccess(service: string): void {
  const circuit = getCircuit(service);
  circuit.failures = 0;
  circuit.state = "closed";
}

/**
 * Registreer een gefaalde call. Open de circuit bij threshold.
 */
export function recordFailure(service: string): void {
  const circuit = getCircuit(service);
  circuit.failures++;
  circuit.lastFailure = Date.now();

  if (circuit.failures >= FAILURE_THRESHOLD) {
    circuit.state = "open";
  }
}

/**
 * Wrapper die een async functie uitvoert met circuit breaker bescherming.
 * Gooit een Error als de service niet beschikbaar is.
 */
export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isServiceAvailable(service)) {
    throw new Error(`Circuit open: ${service} is tijdelijk niet beschikbaar`);
  }

  try {
    const result = await fn();
    recordSuccess(service);
    return result;
  } catch (err) {
    recordFailure(service);
    throw err;
  }
}

/**
 * Haal de huidige status van alle circuits op.
 */
export function getCircuitStatus(): Record<string, { state: string; failures: number }> {
  const status: Record<string, { state: string; failures: number }> = {};
  for (const [service, circuit] of circuits) {
    status[service] = { state: circuit.state, failures: circuit.failures };
  }
  return status;
}
