import { afterEach, expect, it, vi } from "vitest";
import { getEventConfig } from "@/services/event-service";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("shares one cold public config request and keeps the result cached", async () => {
  let resolveResponse!: (response: Response) => void;
  const response = new Promise<Response>((resolve) => { resolveResponse = resolve; });
  const fetchMock = vi.fn(() => response);
  vi.stubGlobal("fetch", fetchMock);

  const first = getEventConfig();
  const second = getEventConfig();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  resolveResponse(Response.json({ seasonalThemesEnabled: true, events: [], updatedAt: 1 }));
  await expect(Promise.all([first, second])).resolves.toEqual([
    { seasonalThemesEnabled: true, events: [], updatedAt: 1 },
    { seasonalThemesEnabled: true, events: [], updatedAt: 1 },
  ]);

  await getEventConfig();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
