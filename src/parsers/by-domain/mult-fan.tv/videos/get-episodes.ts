import { BrowserContext } from "patchright";
import { Episode } from "./types";

export const getEpisodes = async ({
  baseUrl,
  context,
  seasonUrl,
}: {
  context: BrowserContext;
  seasonUrl: string;
  baseUrl: string;
}): Promise<Episode[]> => {
  const page = await context.newPage();

  await page.goto(seasonUrl, { waitUntil: "load" });

  const episodes = page.evaluate((baseUrl) => {
    const episodeLinks = document.querySelectorAll(
      "#descrSeason tbody tr td h2 a"
    );

    return Array.from(episodeLinks).reduce((acc, el) => {
      const href = el.getAttribute("href");
      const name = el.textContent?.trim();

      if (!href || !name) return acc;

      const id = new URL(href, baseUrl).searchParams.get("id");

      if (!id) return acc;

      acc.push({ id, href: baseUrl + href, name });

      return acc;
    }, [] as Episode[]);
  }, baseUrl);

  return episodes;
};
