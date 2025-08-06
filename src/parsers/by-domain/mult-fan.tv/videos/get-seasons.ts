import { BrowserContext } from "patchright";
import { Season } from "./types";

const getMainSeasons = async (baseUrl: string) => {
  const titles = document.querySelectorAll(".numberSeason");
  const other = document.getElementById("otherSeasons");

  const filtered = other
    ? Array.from(titles).filter(
        (el) =>
          (el.compareDocumentPosition(other) &
            Node.DOCUMENT_POSITION_FOLLOWING) !==
          0
      )
    : Array.from(titles);

  return filtered.reduce<Season[]>((result, el) => {
    const link = el.querySelector<HTMLAnchorElement>("a");
    const href = link?.getAttribute("href");
    const id = href ? new URL(href, baseUrl).searchParams.get("id") : null;

    if (href && id) {
      result.push({ id, href: baseUrl + href });
    }

    return result;
  }, []);
};

const getOtherSeasons = async (baseUrl: string) => {
  const container = document.getElementById("otherSeasons");

  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLAnchorElement>("a")).reduce<
    Season[]
  >((result, el) => {
    const href = el.getAttribute("href");
    const id = href ? new URL(href, baseUrl).searchParams.get("id") : null;

    if (href && id) {
      result.push({ id, href: baseUrl + href });
    }

    return result;
  }, []);
};

export const getSeasons = async ({
  baseUrl,
  context,
}: {
  context: BrowserContext;
  baseUrl: string;
}): Promise<Season[]> => {
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "load" });

  const mainSeasons = await page.evaluate(getMainSeasons, baseUrl);
  const otherSeasons = await page.evaluate(getOtherSeasons, baseUrl);

  return [...mainSeasons, ...otherSeasons];
};
