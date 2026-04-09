import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";

const AGENT_ID =
  process.env.ANTHROPIC_AGENT_ID ?? "agent_011CZtYdEGq5ZrArar2K5vSu";
const ENVIRONMENT_ID =
  process.env.ANTHROPIC_ENVIRONMENT_ID ?? "env_01SDn56dorZBkAUnxoVdkSR5";

/**
 * Start een managed agent sessie, stuur een bericht, en verzamel het antwoord.
 * Retourneert de volledige agent-respons als tekst, of null bij fouten.
 */
export async function runAgentSession(
  message: string
): Promise<string | null> {
  const client = new Anthropic();

  let sessionId: string | undefined;

  try {
    // 1. Maak een sessie aan die verwijst naar de bestaande agent
    const session = await client.beta.sessions.create({
      agent: AGENT_ID,
      environment_id: ENVIRONMENT_ID,
    });
    sessionId = session.id;

    // 2. Open de stream VOORDAT we het bericht versturen (stream-first patroon)
    const stream = await client.beta.sessions.events.stream(session.id);

    // 3. Verstuur het user.message event
    await client.beta.sessions.events.send(session.id, {
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: message }],
        },
      ],
    });

    // 4. Verzamel agent.message tekst terwijl we streamen
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
          // Sessie is definitief beëindigd
          return responseText || null;

        case "session.status_idle":
          // Klaar als stop_reason niet requires_action is
          if (event.stop_reason?.type !== "requires_action") {
            return responseText || null;
          }
          break;

        case "session.error":
          Sentry.captureMessage("Managed agent session error", {
            level: "error",
            extra: { sessionId: session.id, event },
          });
          return null;
      }
    }

    return responseText || null;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { area: "managed-agent-session" },
      extra: { sessionId },
    });
    return null;
  }
}
