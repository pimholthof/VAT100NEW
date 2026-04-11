import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";

const AGENT_ID =
  process.env.ANTHROPIC_AGENT_ID ?? "agent_011CZtYdEGq5ZrArar2K5vSu";
const ENVIRONMENT_ID =
  process.env.ANTHROPIC_ENVIRONMENT_ID ?? "env_01SDn56dorZBkAUnxoVdkSR5";

/**
 * Confidence thresholds per plan-tier (re-export vanuit centrale config).
 */
export {
  PLAN_CONFIDENCE_THRESHOLDS,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from "@/lib/config/automation";

/**
 * Herbruikbare agent sessie. Eén sessie per sync-run, meerdere berichten.
 * Scheelt session.create + container-setup latency per batch.
 */
export class AgentSession {
  private client: Anthropic;
  private sessionId: string | null = null;

  constructor() {
    this.client = new Anthropic();
  }

  /** Maak de sessie aan (eenmalig per sync-run). */
  async open(): Promise<void> {
    const session = await this.client.beta.sessions.create({
      agent: AGENT_ID,
      environment_id: ENVIRONMENT_ID,
    });
    this.sessionId = session.id;
  }

  /** Stuur een bericht en verzamel het volledige antwoord. */
  async send(message: string): Promise<string | null> {
    if (!this.sessionId) {
      throw new Error("AgentSession: call open() before send()");
    }

    try {
      // Stream-first: open stream voordat we het bericht versturen
      const stream = await this.client.beta.sessions.events.stream(this.sessionId);

      await this.client.beta.sessions.events.send(this.sessionId, {
        events: [
          {
            type: "user.message",
            content: [{ type: "text", text: message }],
          },
        ],
      });

      let responseText = "";

      for await (const event of stream) {
        switch (event.type) {
          case "agent.message":
            for (const block of event.content) {
              if (block.type === "text") {
                responseText += block.text;
              }
            }
            break;

          case "session.status_terminated":
            // Sessie definitief beëindigd — markeer als gesloten
            this.sessionId = null;
            return responseText || null;

          case "session.status_idle":
            if (event.stop_reason?.type !== "requires_action") {
              return responseText || null;
            }
            break;

          case "session.error":
            Sentry.captureMessage("Managed agent session error", {
              level: "error",
              extra: { sessionId: this.sessionId, event },
            });
            return null;
        }
      }

      return responseText || null;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: "managed-agent-session" },
        extra: { sessionId: this.sessionId },
      });
      return null;
    }
  }
}

/**
 * Convenience wrapper: enkele vraag, nieuwe sessie.
 * Achterwaarts compatibel voor eenvoudige use-cases.
 */
export async function runAgentSession(
  message: string
): Promise<string | null> {
  const session = new AgentSession();
  try {
    await session.open();
    return await session.send(message);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { area: "managed-agent-session" },
    });
    return null;
  }
}
