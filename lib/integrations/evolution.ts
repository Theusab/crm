export type EvolutionTextResult = {
  messageId: string | null;
};

export function isEvolutionConfigured() {
  return Boolean(
    process.env.EVOLUTION_API_URL &&
      process.env.EVOLUTION_API_KEY &&
      process.env.EVOLUTION_INSTANCE,
  );
}

export async function sendEvolutionText(to: string, text: string): Promise<EvolutionTextResult> {
  const baseUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl || !apiKey || !instance) {
    throw new Error("Evolution API não está configurada no servidor.");
  }

  const number = to.replace(/\D/g, "");
  if (number.length < 8 || number.length > 15) {
    throw new Error("O telefone do lead precisa incluir o código do país para o WhatsApp.");
  }

  const response = await fetch(
    `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number, text }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Evolution API respondeu ${response.status}: ${responseBody.slice(0, 500) || response.statusText}`,
    );
  }

  let messageId: string | null = null;
  if (responseBody) {
    try {
      const body: unknown = JSON.parse(responseBody);
      if (body && typeof body === "object") {
        const data = body as { key?: { id?: unknown }; id?: unknown };
        const id = data.key?.id ?? data.id;
        if (typeof id === "string") messageId = id;
      }
    } catch {
      messageId = null;
    }
  }

  return { messageId };
}
