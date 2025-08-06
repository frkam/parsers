import { chromium } from "patchright";
import { getConfig } from "@/config";
import { domain } from "../constants";
import { logger } from "./logger";
import { getSeasons } from "./get-seasons";
import { getEpisodes } from "./get-episodes";
import { downloadEpisode } from "./download-episode";
import { delay, getRandomNumberInRange } from "@/lib/delay";
import { SECONDS_IN_MINUTE } from "@/lib/time";

type LoadVideosParams = {
  destination: string;
  subdomain: string;
  seasonsToDownload?: number[];
  voicesToDownload?: number[];
};

export const downloadVideos = async ({
  destination,
  subdomain,
  seasonsToDownload,
  voicesToDownload,
}: LoadVideosParams) => {
  try {
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

    const seasons = await getSeasons({ context, baseUrl });

    if (!seasons.length) {
      throw new Error(
        `No seasons found for ${subdomain} at ${baseUrl}. Check the subdomain or the site structure.`
      );
    }

    logger.info(
      `Available seasons on service: ${seasons.map((s) => s.id).toString()}`
    );

    const availableSeasons = seasonsToDownload
      ? seasons.filter((season) =>
          seasonsToDownload?.includes(Number(season.id))
        )
      : seasons;

    if (!availableSeasons.length) {
      throw new Error(
        "Seasons to download are not specified or do not match available seasons."
      );
    }

    for (const season of availableSeasons) {
      const episodes = await getEpisodes({
        context,
        seasonUrl: season.href,
        baseUrl,
      });

      logger.info(`Season "${season.id}" has "${episodes.length}" episodes`);

      for (const episode of episodes) {
        try {
          logger.info(
            `Downloading episode "${episode.id}" from season "${season.id}"`
          );

          await downloadEpisode({
            context,
            episode,
            season,
            destination,
            voicesToDownload,
          });

          logger.info(
            `Episode "${episode.id}" from season "${season.id}" downloaded`
          );

          const delayTime = getRandomNumberInRange(
            0.5 * SECONDS_IN_MINUTE,
            1 * SECONDS_IN_MINUTE
          );

          logger.info(
            `Waiting time before downloading next episode: ${Math.floor(
              delayTime / SECONDS_IN_MINUTE
            )} minutes`
          );

          await delay(delayTime);
        } catch (error) {
          if (error instanceof Error) {
            logger.error(
              `Failed to download episode "${episode.id}" from season "${season.id}": ${error.message}`
            );
          }
        }
      }
    }
  } catch (error) {
    logger.error(error);

    throw error;
  }
};
