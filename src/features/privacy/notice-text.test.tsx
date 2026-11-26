import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { NoticeText, paragraphsOf } from "./notice-text";

describe("NoticeText (Step 60.4)", () => {
  it("splits paragraphs on a blank line, even one holding spaces or tabs", () => {
    expect(paragraphsOf("First\nstill first\n\nSecond\n \t \nThird")).toEqual([
      "First\nstill first",
      "Second",
      "Third",
    ]);
  });

  it("shows HTML in a notice as text, never as markup", () => {
    const { container } = render(<NoticeText body={'<script>alert("x")</script>\n\n<b>bold</b> &amp;'} />);

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent('<script>alert("x")</script>');
    expect(paragraphs[1]).toHaveTextContent("<b>bold</b> &amp;");
  });
});
