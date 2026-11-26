import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const publishPrivacyNotice = vi.fn();
vi.mock("./privacy-actions", () => ({
  publishPrivacyNotice: (...args: unknown[]) => publishPrivacyNotice(...args),
}));
vi.mock("sonner", () => ({ toast: vi.fn() }));

import { toast } from "sonner";
import { PrivacyNoticeForm } from "./privacy-notice-form";
import { NOTICE_STALE_MESSAGE } from "./privacy-messages";
import type { PrivacyNotice } from "./types";

const BODY = "Our school keeps attendance. ".repeat(10).trim();
const current: PrivacyNotice = {
  schoolId: "school-a",
  version: 2,
  body: BODY,
  publishedAt: "2026-11-20T02:00:00.000Z",
};

const textBox = () => screen.getByLabelText("Notice wording");
const publishButton = () => screen.getByRole("button", { name: /^Publish as version/ });

async function openConfirmation(text: string) {
  fireEvent.change(textBox(), { target: { value: text } });
  fireEvent.click(publishButton());
  return screen.findByRole("dialog", { name: "Publish version 3?" });
}

describe("PrivacyNoticeForm (Step 60.4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says when nothing is published yet, and offers version 1", () => {
    render(<PrivacyNoticeForm current={null} earlier={[]} />);

    expect(screen.getByText(/Not published yet\./)).toBeInTheDocument();
    expect(publishButton()).toHaveAccessibleName("Publish as version 1…");
  });

  it("starts from the current version, and lists the earlier ones by date", () => {
    render(<PrivacyNoticeForm current={current} earlier={[{ version: 1, publishedAt: "2026-11-01T02:00:00.000Z" }]} />);

    expect(textBox()).toHaveValue(BODY);
    expect(screen.getByText(/published November 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/version 1 \(November 1, 2026\)/)).toBeInTheDocument();
  });

  it("shows a too-short notice's problem under the text box without asking to confirm", () => {
    render(<PrivacyNoticeForm current={null} earlier={[]} />);

    fireEvent.change(textBox(), { target: { value: "Too short" } });
    fireEvent.click(publishButton());

    expect(screen.getByText(/at least 200 characters/)).toBeInTheDocument();
    expect(textBox()).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("refuses the current version's text unchanged", () => {
    render(<PrivacyNoticeForm current={current} earlier={[]} />);

    fireEvent.click(publishButton());

    expect(screen.getByText(/same as version 2/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks to confirm, naming the next version, then publishes on top of the current one", async () => {
    publishPrivacyNotice.mockResolvedValue({ ok: true, version: 3 });
    render(<PrivacyNoticeForm current={current} earlier={[]} />);

    const dialog = await openConfirmation(`${BODY} And more.`);
    expect(dialog).toHaveTextContent("asked to read and accept version 3");
    fireEvent.click(screen.getByRole("button", { name: "Publish version 3" }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith("Published version 3 of the privacy notice."));
    expect(publishPrivacyNotice).toHaveBeenCalledWith({ body: `${BODY} And more.`, basedOnVersion: 2 });
  });

  it("keeps the text and offers a reload when someone else published meanwhile", async () => {
    publishPrivacyNotice.mockResolvedValue({ ok: false, formError: NOTICE_STALE_MESSAGE });
    render(<PrivacyNoticeForm current={current} earlier={[]} />);

    await openConfirmation(`${BODY} Mine.`);
    fireEvent.click(screen.getByRole("button", { name: "Publish version 3" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(NOTICE_STALE_MESSAGE);
    expect(textBox()).toHaveValue(`${BODY} Mine.`);
    expect(toast).not.toHaveBeenCalled();
  });

  it("disables the buttons while publishing", async () => {
    let finish: (value: unknown) => void = () => {};
    publishPrivacyNotice.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<PrivacyNoticeForm current={current} earlier={[]} />);

    await openConfirmation(`${BODY} Busy.`);
    fireEvent.click(screen.getByRole("button", { name: "Publish version 3" }));

    expect(await screen.findByRole("button", { name: "Publishing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    finish({ ok: true, version: 3 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
