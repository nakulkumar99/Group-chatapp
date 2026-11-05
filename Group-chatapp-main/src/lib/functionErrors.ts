export interface FunctionResponse<T> {
  data: T | null;
  error: Error | null;
  status: number;
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check the details and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "The requested group could not be found.",
  409: "You are already a member of this group.",
  429: "Too many attempts. Please try again later.",
};

function readBackendError(bodyText: string): string | null {
  if (!bodyText.trim()) return null;

  try {
    const payload = JSON.parse(bodyText);
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // A proxy/gateway may return HTML or plain text instead of JSON.
  }

  return null;
}

export function getFunctionErrorMessage(status: number, bodyText: string): string {
  const backendError = readBackendError(bodyText);
  if (backendError) return backendError;

  if (status >= 500) {
    return "The group service is temporarily unavailable. Please try again.";
  }

  return (
    DEFAULT_MESSAGES[status] ||
    (status >= 400
      ? `The group service rejected the request (HTTP ${status}).`
      : "Unexpected response from the group service. Please try again.")
  );
}

export async function parseFunctionResponse<T>(response: Response): Promise<FunctionResponse<T>> {
  let bodyText = "";

  try {
    bodyText = await response.text();
  } catch {
    return {
      data: null,
      error: new Error("The group service returned an unreadable response. Please try again."),
      status: response.status,
    };
  }

  if (!response.ok) {
    return {
      data: null,
      error: new Error(getFunctionErrorMessage(response.status, bodyText)),
      status: response.status,
    };
  }

  if (!bodyText.trim()) {
    return { data: null, error: null, status: response.status };
  }

  try {
    const data = JSON.parse(bodyText) as T & { error?: unknown };
    if (data && typeof data === "object" && typeof data.error === "string" && data.error) {
      return { data: null, error: new Error(data.error), status: response.status };
    }
    return { data, error: null, status: response.status };
  } catch {
    return {
      data: null,
      error: new Error("Unexpected response from the group service. Please try again."),
      status: response.status,
    };
  }
}

export function getNetworkErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request timed out. Please try again.";
  }

  if (error instanceof TypeError) {
    return "Could not reach the group service. Check your connection and try again.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Network error. Please check your connection and try again.";
}
