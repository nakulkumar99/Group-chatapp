import { describe, expect, it } from "vitest";
import {
  getFunctionErrorMessage,
  getNetworkErrorMessage,
  parseFunctionResponse,
} from "./functionErrors";

function makeResponse(status: number, body: string, contentType = "application/json") {
  return new Response(body, {
    status,
    headers: { "Content-Type": contentType },
  });
}

describe("functionErrors", () => {
  it("uses the backend message for an incorrect password", () => {
    expect(
      getFunctionErrorMessage(403, JSON.stringify({ error: "Incorrect password" }))
    ).toBe("Incorrect password");
  });

  it("uses backend rate-limit details", () => {
    expect(
      getFunctionErrorMessage(
        429,
        JSON.stringify({ error: "Too many attempts. Please try again later." })
      )
    ).toBe("Too many attempts. Please try again later.");
  });

  it("turns a gateway HTML response into a clear server error", () => {
    expect(getFunctionErrorMessage(502, "<html>Bad gateway</html>")).toBe(
      "The group service is temporarily unavailable. Please try again."
    );
  });

  it("maps an empty unauthorized response to a session message", () => {
    expect(getFunctionErrorMessage(401, "")).toBe(
      "Your session has expired. Please sign in again."
    );
  });

  it("parses a successful join response", async () => {
    const result = await parseFunctionResponse<{ success: boolean }>(
      makeResponse(200, JSON.stringify({ success: true }))
    );

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ success: true });
    expect(result.status).toBe(200);
  });

  it("does not crash when a proxy returns non-JSON on success", async () => {
    const result = await parseFunctionResponse(makeResponse(200, "<html>proxy</html>", "text/html"));

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe(
      "Unexpected response from the group service. Please try again."
    );
  });

  it("surfaces a structured error returned with a 2xx status", async () => {
    const result = await parseFunctionResponse(
      makeResponse(200, JSON.stringify({ error: "Already a member" }))
    );

    expect(result.error?.message).toBe("Already a member");
  });

  it("distinguishes timeouts, network failures, and normal errors", () => {
    expect(getNetworkErrorMessage(new DOMException("Aborted", "AbortError"))).toBe(
      "The request timed out. Please try again."
    );
    expect(getNetworkErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "Could not reach the group service. Check your connection and try again."
    );
    expect(getNetworkErrorMessage(new Error("Incorrect password"))).toBe(
      "Incorrect password"
    );
  });
});
