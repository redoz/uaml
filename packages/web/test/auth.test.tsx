import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "../src/App";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify({ error: "Not connected" }), { status: 401 })));
});

describe("anonymous canvas", () => {
  it("renders the canvas (no gate) and shows Sign in when there is no session", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Sign in")).toBeTruthy());
    expect(screen.queryByText("Connect to OWOX")).toBeNull();
  });
});
