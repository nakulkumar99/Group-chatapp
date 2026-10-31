export interface SearchableMessage {
  content?: string | null;
  file_name?: string | null;
  profile?: {
    username?: string | null;
  } | null;
}

/**
 * Normalizes a raw search query so matching is case-insensitive and
 * whitespace-insensitive at the edges.
 */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Returns true when the message contains the query in its text content, its
 * attachment name, or its author's username. An empty query matches everything.
 */
export function messageMatchesQuery(
  message: SearchableMessage,
  query: string
): boolean {
  const needle = normalizeSearchQuery(query);
  if (!needle) return true;

  const fields = [
    message.content,
    message.file_name,
    message.profile?.username,
  ];

  return fields.some(
    (field) =>
      typeof field === "string" && field.toLowerCase().includes(needle)
  );
}

/**
 * Filters a list of messages by a free-text query. Returns a new array and
 * preserves the original order. An empty/whitespace query returns all messages.
 */
export function searchMessages<T extends SearchableMessage>(
  messages: readonly T[],
  query: string
): T[] {
  const needle = normalizeSearchQuery(query);
  if (!needle) return [...messages];

  return messages.filter((message) => messageMatchesQuery(message, needle));
}
