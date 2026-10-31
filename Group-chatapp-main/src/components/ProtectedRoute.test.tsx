import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderRoute(initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div>Auth page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to the auth page", async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      initializing: false,
    } as never);

    renderRoute("/profile");

    expect(await screen.findByText("Auth page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1" },
      session: null,
      loading: false,
      initializing: false,
    } as never);

    renderRoute("/profile");

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("waits for auth initialization before deciding", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      initializing: true,
    } as never);

    renderRoute("/profile");

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Auth page")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
