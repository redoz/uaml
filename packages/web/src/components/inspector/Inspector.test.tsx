import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ModelNode } from "@mc/okf";
import { Inspector } from "./Inspector";
import * as qlib from "../../lib/questions";

const node: ModelNode = {
  key: "a", title: "Orders", inputSource: "SQL",
  schema: [{ name: "id", type: "INTEGER", pk: true }],
  position: { x: 0, y: 0 }, status: "pending",
};
const GOAL = { niche: "E-commerce / Retail", goal: "Increase ROAS while holding CPC" };
const noop = () => {};

afterEach(() => vi.restoreAllMocks());

describe("Inspector + QuestionsPanel", () => {
  it("shows the questions block for a selected node when a goal is set", () => {
    vi.spyOn(qlib, "getQuestions").mockResolvedValue([{ question: "Q", unlockedBy: "U" }]);
    render(
      <Inspector selection={{ type: "node", id: "a" }} nodes={[node]} edges={[]} goal={GOAL}
        onUpdateNode={noop} onUpdateEdge={noop} onClose={noop} />,
    );
    expect(screen.getByText(/Questions this unlocks/i)).toBeTruthy();
  });

  it("hides the questions block when no goal is set", () => {
    render(
      <Inspector selection={{ type: "node", id: "a" }} nodes={[node]} edges={[]} goal={null}
        onUpdateNode={noop} onUpdateEdge={noop} onClose={noop} />,
    );
    expect(screen.queryByText(/Questions this unlocks/i)).toBeNull();
  });
});
