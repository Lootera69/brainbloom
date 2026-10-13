import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkshopProvenance } from "@/components/studio/workshop-provenance";
import { parseWorkshopBundle } from "./workshop-import";
import fullBundle from "./fixtures/workshop-v2-bundle.json";

describe("saved workshop provenance display", () => {
  it("shows the source credit, full notice, check limits and original download", async () => {
    const [draft] = await parseWorkshopBundle(fullBundle);
    const markup = renderToStaticMarkup(createElement(WorkshopProvenance, { metadata: draft.metadata }));
    expect(markup).toContain("Princeton WordNet and the Open English Wordnet team");
    expect(markup).toContain("Creative Commons");
    expect(markup).toContain("https://creativecommons.org/licenses/by/4.0/");
    expect(markup).toContain("later edits require review");
    expect(markup).toContain(draft.metadata.itemSha256);
    expect(markup).toContain("Download original bundle");
  });

  it("renders imported notices as text and never makes executable source links", async () => {
    const [draft] = await parseWorkshopBundle(fullBundle);
    draft.metadata.sources[0] = {
      ...draft.metadata.sources[0], name: "<script>alert(1)</script>",
      url: "javascript:alert(1)", licenseUrl: "data:text/html,unsafe",
    };
    const markup = renderToStaticMarkup(createElement(WorkshopProvenance, { metadata: draft.metadata }));
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("javascript:");
    expect(markup).not.toContain("data:text/html");
  });
});
