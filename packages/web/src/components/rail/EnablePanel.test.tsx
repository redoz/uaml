import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnablePanel } from "./EnablePanel";

describe("EnablePanel", () => {
  it("shows the intro copy and both legal links", () => {
    render(<EnablePanel onGoogle={()=>{}} onGitHub={()=>{}} onEmail={()=>{}} />);
    expect(screen.getByText(/we'll occasionally email you about data-modeling topics/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href"))
      .toBe("https://www.owox.com/policies/terms-of-service");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href"))
      .toBe("https://www.owox.com/policies/privacy");
  });
  it("does NOT list named sharing as a perk", () => {
    render(<EnablePanel onGoogle={()=>{}} onGitHub={()=>{}} onEmail={()=>{}} />);
    expect(screen.queryByText(/named sharing/i)).toBeNull();
  });
  it("submits the typed email", () => {
    const onEmail = vi.fn();
    render(<EnablePanel onGoogle={()=>{}} onGitHub={()=>{}} onEmail={onEmail} />);
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "a@b.co" } });
    fireEvent.click(screen.getByRole("button", { name: /send link/i }));
    expect(onEmail).toHaveBeenCalledWith("a@b.co");
  });
});
