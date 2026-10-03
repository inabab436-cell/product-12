/**
 * Server-only AgentMail sender (used for merchant sign-up / password-reset codes).
 * Reads AGENTMAIL_API_KEY and AGENTMAIL_INBOX_ID at call time.
 */
export async function sendAgentMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.AGENTMAIL_API_KEY?.trim().replace(/^bearer\s+/i, "");
  const inbox = process.env.AGENTMAIL_INBOX_ID?.trim();
  if (!apiKey) throw new Error("Missing required environment variable: AGENTMAIL_API_KEY");
  if (!inbox) throw new Error("Missing required environment variable: AGENTMAIL_INBOX_ID");

  const res = await fetch(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(`AgentMail send failed [${res.status}]: ${body}`);
    throw new Error(`AgentMail send failed [${res.status}]`);
  }
}
