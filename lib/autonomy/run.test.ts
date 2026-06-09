import { describe, it, expect, vi } from "vitest";
import { runAgentAction } from "./run";
import { defineAction, type DispatchContext } from "./dispatcher";

const ok: DispatchContext = { autonomyEnabled: true, invariantsOk: true };

function tier1(confidence: number) {
  return defineAction("mark_invoice_overdue", { confidence, evidence: [], summary: "test" });
}

describe("runAgentAction", () => {
  it("voert uit bij 'execute' en geeft het resultaat terug", async () => {
    const onExecute = vi.fn().mockResolvedValue("done");
    const onPropose = vi.fn();
    const onLog = vi.fn();

    const r = await runAgentAction(tier1(1), ok, { onExecute, onPropose, onLog });

    expect(onExecute).toHaveBeenCalledOnce();
    expect(onPropose).not.toHaveBeenCalled();
    expect(r.executed).toBe(true);
    expect(r.result).toBe("done");
    expect(onLog).toHaveBeenCalledOnce();
    expect(onLog.mock.calls[0][0]).toMatchObject({ executed: true, result: "done" });
  });

  it("legt voor bij 'propose' en voert NIET uit", async () => {
    const onExecute = vi.fn().mockResolvedValue("done");
    const onPropose = vi.fn();
    const onLog = vi.fn();

    // Te lage zekerheid → propose.
    const r = await runAgentAction(tier1(0.1), ok, { onExecute, onPropose, onLog });

    expect(onExecute).not.toHaveBeenCalled();
    expect(onPropose).toHaveBeenCalledOnce();
    expect(r.executed).toBe(false);
    expect(r.result).toBeUndefined();
    expect(onLog.mock.calls[0][0]).toMatchObject({ executed: false });
  });

  it("blokkeert bij een gebroken invariant en voert NIET uit", async () => {
    const onExecute = vi.fn().mockResolvedValue("done");
    const onBlock = vi.fn();

    const r = await runAgentAction(tier1(1), { autonomyEnabled: true, invariantsOk: false }, {
      onExecute,
      onBlock,
    });

    expect(onExecute).not.toHaveBeenCalled();
    expect(onBlock).toHaveBeenCalledOnce();
    expect(r.decision.decision).toBe("block");
  });

  it("logt ook zonder propose/block-handler (audit blijft)", async () => {
    const onExecute = vi.fn().mockResolvedValue(42);
    const onLog = vi.fn();
    const r = await runAgentAction(tier1(1), ok, { onExecute, onLog });
    expect(r.result).toBe(42);
    expect(onLog).toHaveBeenCalledOnce();
  });
});
