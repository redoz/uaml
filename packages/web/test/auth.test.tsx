import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "../src/App";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify({ error: "Not connected" }), { status: 401 })));
});

describe("auth gate", () => {
  it("renders Connect to OWOX when there is no session", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Connect to OWOX")).toBeTruthy());
    expect(screen.getByPlaceholderText("owox_key_...")).toBeTruthy();
  });
});
