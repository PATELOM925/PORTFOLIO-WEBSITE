// Server-sent events: write one event, and parse a stream of events.

export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const SSE_KEEP = ": keep\n\n";

export type SseMessage = { event: string; data: string };

// Incremental parser. Push text as it arrives. It returns the complete events.
export class SseParser {
  private buffer = "";

  push(text: string): SseMessage[] {
    this.buffer += text;
    const out: SseMessage[] = [];
    for (;;) {
      const match = /\r?\n\r?\n/.exec(this.buffer);
      if (!match) break;
      const block = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      const message = parseBlock(block);
      if (message) out.push(message);
    }
    return out;
  }

  flush(): SseMessage[] {
    const rest = this.buffer;
    this.buffer = "";
    const message = rest.trim() ? parseBlock(rest) : null;
    return message ? [message] : [];
  }
}

function parseBlock(block: string): SseMessage | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  if (!data.length && event === "message") return null;
  return { event, data: data.join("\n") };
}

export function parseSse(text: string): SseMessage[] {
  const parser = new SseParser();
  return [...parser.push(text), ...parser.flush()];
}

// Reads a fetch body as SSE messages.
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const message of parser.push(decoder.decode(value, { stream: true }))) yield message;
    }
    for (const message of parser.flush()) yield message;
  } finally {
    reader.releaseLock();
  }
}
