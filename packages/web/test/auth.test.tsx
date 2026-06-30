import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "../src/App";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify({ error: "Not connected" }), { status: 401 })));
});

describe("anonymous canvas", () => {
  it("renders the canvas (no gate) for anonymous users — no OWOX connect modal on load", async () => {
    render(<App />);
    // Canvas loads freely; "Push to OWOX" always appears, no forced sign-in gate.
    await waitFor(() => expect(screen.getByText(/Push to OWOX/i)).toBeTruthy());
    expect(screen.queryByText("Connect to OWOX")).toBeNull();
  });
});
