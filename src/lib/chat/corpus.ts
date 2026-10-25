import corpusFile from "@/demos/ttc-pulse/data/chat-corpus.json";

export type Mode = "bus" | "streetcar" | "subway";
export type ChunkMode = Mode | "all";
export type ChunkKind = "entity" | "rank" | "overview" | "time" | "causes" | "quality" | "method" | "post" | "limits" | "live";

export type Chunk = {
  id: string;
  kind: ChunkKind;
  mode: ChunkMode;
  label: string;
  href: string;
  text: string;
  tokens: number;
  untrusted?: boolean;
};

export type DirectoryEntry = {
  id: string;
  file: string;
  mode: Mode;
  scope: "route" | "station" | "line";
  name: string;
  n: number;
  aliases: string[];
  chunk: number;
};

export type Corpus = {
  meta: { commit: string; built: string; years: number[]; chunkCount: number };
  chunks: Chunk[];
  // docCount: chunks in the index. Entity chunks are not indexed (docLen 0).
  index: { docCount: number; avgLen: number; docLen: number[]; postings: Record<string, [number, number][]> };
  directory: DirectoryEntry[];
};

export const MODES: Mode[] = ["bus", "streetcar", "subway"];

let cached: (Corpus & { byId: Map<string, number> }) | null = null;

// One parse for each isolate. If the bundle gets too large, this is the only function to change (load from ASSETS).
export function loadCorpus(): Corpus & { byId: Map<string, number> } {
  if (cached) return cached;
  const corpus = corpusFile as unknown as Corpus;
  const byId = new Map<string, number>();
  corpus.chunks.forEach((chunk, i) => byId.set(chunk.id, i));
  cached = { ...corpus, byId };
  return cached;
}

export function chunkById(id: string): Chunk | undefined {
  const corpus = loadCorpus();
  const i = corpus.byId.get(id);
  return i === undefined ? undefined : corpus.chunks[i];
}
