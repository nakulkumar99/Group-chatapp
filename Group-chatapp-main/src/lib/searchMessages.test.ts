import { describe, it, expect } from "vitest";
import {
  messageMatchesQuery,
  normalizeSearchQuery,
  searchMessages,
} from "./searchMessages";

const messages = [
  {
    id: "1",
    content: "Hello World",
    file_name: null,
    profile: { username: "alice" },
  },
  {
    id: "2",
    content: "Deployment notes",
    file_name: "release-plan.pdf",
    profile: { username: "bob" },
  },
  {
    id: "3",
    content: "See you tomorrow",
    file_name: null,
    profile: null,
  },
];

describe("normalizeSearchQuery", () => {
  it("trims and lowercases the query", () => {
    expect(normalizeSearchQuery("  Hello  ")).toBe("hello");
  });
});

describe("messageMatchesQuery", () => {
  it("matches message content case-insensitively", () => {
    expect(messageMatchesQuery(messages[0], "hello")).toBe(true);
  });

  it("matches a partial word inside the content", () => {
    expect(messageMatchesQuery(messages[0], "orl")).toBe(true);
  });

  it("matches attachment file names", () => {
    expect(messageMatchesQuery(messages[1], "release-plan")).toBe(true);
  });

  it("matches author usernames", () => {
    expect(messageMatchesQuery(messages[1], "BOB")).toBe(true);
  });

  it("returns false when there is no match", () => {
    expect(messageMatchesQuery(messages[0], "zebra")).toBe(false);
  });

  it("matches everything for an empty or whitespace query", () => {
    expect(messageMatchesQuery(messages[0], "")).toBe(true);
    expect(messageMatchesQuery(messages[0], "   ")).toBe(true);
  });
});

describe("searchMessages", () => {
  it("filters messages and preserves their order", () => {
    const results = searchMessages(messages, "o");
    expect(results.map((m) => m.id)).toEqual(["1", "2", "3"]);
  });

  it("returns only matching messages", () => {
    const results = searchMessages(messages, "deployment");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2");
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchMessages(messages, "nothing-here")).toEqual([]);
  });

  it("returns a copy of all messages for a blank query", () => {
    const results = searchMessages(messages, "  ");
    expect(results).toHaveLength(messages.length);
    expect(results).not.toBe(messages);
  });

  it("does not mutate the original list", () => {
    const before = [...messages];
    searchMessages(messages, "hello");
    expect(messages).toEqual(before);
  });
});
