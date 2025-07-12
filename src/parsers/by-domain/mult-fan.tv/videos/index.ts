import { BrowserContext, chromium } from "patchright";
import { getConfig } from "@/config";
import { domain } from "../constants";
import { logger } from "@/lib/logger";
import { delay, getRandomNumberInRange } from "@/lib/delay";
import { promises as fs } from "fs";
import path from "path";

type LoadVideosParams = {
  destination: string;
  subdomain: string;
  seasonsToLoad?: number[];
};

type Season = {
  id: string;
  href: string;
};

type Episode = {
  id: string;
  href: string;
};

type Voice = {
  name: string;
  href: string;
};

const getSeasons = async ({
  baseUrl,
  context,
}: {
  context: BrowserContext;
  baseUrl: string;
}): Promise<Season[]> => {
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "load" });

  const mainSeasons = await page.evaluate((baseUrl) => {
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
  }, baseUrl);

  const otherSeasons = await page.evaluate((baseUrl) => {
    const container = document.getElementById("otherSeasons");

    if (!container) return [];

    return Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a")
    ).reduce<Season[]>((result, el) => {
      const href = el.getAttribute("href");
      const id = href ? new URL(href, baseUrl).searchParams.get("id") : null;

      if (href && id) {
        result.push({ id, href: baseUrl + href });
      }

      return result;
    }, []);
  }, baseUrl);

  return [...mainSeasons, ...otherSeasons];
};

const getEpisodes = async ({
  baseUrl,
  context,
  seasonUrl,
}: {
  context: BrowserContext;
  seasonUrl: string;
  baseUrl: string;
}) => {
  const page = await context.newPage();

  await page.goto(seasonUrl, { waitUntil: "load" });

  const episodes = page.evaluate((baseUrl) => {
    const episodeLinks = document.querySelectorAll(
      "#descrSeason tbody tr td h2 a"
    );

    return Array.from(episodeLinks).reduce((acc, el) => {
      const href = el.getAttribute("href");

      if (!href) return acc;

      const id = new URL(href, baseUrl).searchParams.get("id");

      if (!id) return acc;

      acc.push({ id, href: baseUrl + href });

      return acc;
    }, [] as Episode[]);
  }, baseUrl);

  return episodes;
};

const downloadEpisode = async ({
  context,
  episode,
  season,
  destination,
  seriesName,
}: {
  context: BrowserContext;
  episode: Episode;
  season: Season;
  destination: string;
  seriesName: string;
}) => {
  const page = await context.newPage();

  await page.goto(episode.href, { waitUntil: "load" });

  const episodeName = await page.evaluate(() => {
    const title = document.querySelector<HTMLDivElement>("#titleSeriesEng");

    return title?.textContent?.trim() || "";
  });

  const iframeVideoUrl = await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>("pjsdiv video");
    return video?.src;
  });

  if (!iframeVideoUrl) {
    return;
  }

  const voices = await page.evaluate<Voice[]>(() => {
    const voicesList =
      document.querySelectorAll<HTMLAnchorElement>("#voice h2 a");

    return Array.from(voicesList).map((el) => {
      return { name: el.textContent?.trim() || "", href: el.href };
    });
  });

  for (const voice of voices) {
    const response = await fetch(iframeVideoUrl);

    if (!response.ok) {
      logger.error(
        `Failed to download video: ${response.status} ${response.statusText}`
      );

      return;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `${episode.id.slice(-2)} ${episodeName}.${iframeVideoUrl
      .split(".")
      .pop()}`;

    const filePath = path.join(
      destination,
      seriesName,
      `/${seriesName}.S${season.id}`,
      `/${voice.name}`,
      fileName
    );
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    logger.info(`Saved video to ${filePath}`);
  }

  await page.close();
};

export const loadSeries = async ({
  destination,
  subdomain,
  seasonsToLoad,
}: LoadVideosParams) => {
  const config = getConfig();

  const context = await chromium.launchPersistentContext(
    config.browserDataLocation,
    {
      channel: "chrome",
      headless: false,
      viewport: null,
    }
  );

  const baseUrl = `https://${subdomain}.${domain}/`;

  const seasons = (await getSeasons({ context, baseUrl })).filter(({ id }) => {
    return seasonsToLoad?.includes(Number(id));
  });

  logger.info(`Seasons to load: ${seasons.length}`);

  for (const season of seasons) {
    const episodes = await getEpisodes({
      context,
      seasonUrl: season.href,
      baseUrl,
    });

    logger.info(`Loading ${episodes.length} episodes from season ${season.id}`);

    for (const episode of episodes) {
      logger.info(`Loading episode ${episode.id}`);

      await downloadEpisode({
        context,
        episode,
        season,
        destination,
        seriesName: subdomain,
      });

      logger.info(`Episode ${episode.id} loaded successfully`);

      const delayTime = getRandomNumberInRange(120, 600);

      logger.info(
        `Waiting time before next episode: ${Math.floor(
          delayTime / 60
        )} minutes`
      );

      await delay(delayTime);
    }
  }
};
