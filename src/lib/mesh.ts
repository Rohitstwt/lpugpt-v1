type MeshEvent = {
  id: string;
  type: string;
  title: string;
  body: string;
  courseCode?: string | null;
  location?: string | null;
  authorName?: string | null;
  createdAt: string;
};

type Subscriber = {
  id: string;
  userId: string;
  send: (event: MeshEvent) => void;
};

const subscribers = new Set<Subscriber>();
const recent: MeshEvent[] = [];
const MAX_RECENT = 50;

export function publishMeshEvent(event: MeshEvent) {
  recent.unshift(event);
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;

  for (const sub of subscribers) {
    try {
      sub.send(event);
    } catch {
      subscribers.delete(sub);
    }
  }
}

export function subscribeMesh(
  userId: string,
  send: (event: MeshEvent) => void
): () => void {
  const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const sub: Subscriber = { id, userId, send };
  subscribers.add(sub);
  return () => subscribers.delete(sub);
}

export function getRecentMeshEvents(limit = 20): MeshEvent[] {
  return recent.slice(0, limit);
}

export type { MeshEvent };
