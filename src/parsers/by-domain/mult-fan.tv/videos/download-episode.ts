import { BrowserContext } from "patchright";
import { Episode, Season, Voice } from "./types";
import { logger } from "./logger";
import { promises as fs } from "fs";
import { getEpisodeFilePath } from "./get-episode-file-path";
import { downloadFile } from "@/lib/download-file";
import bytes from "bytes";
import { delay } from "@/lib/delay";
import { checkIsFileExists } from "@/lib/check-is-file-exists";

const downloadEpisodeVoice = async ({
  context,
  voice,
  episode,
  season,
  destination,
}: {
  context: BrowserContext;
  voice: Voice;
  episode: Episode;
  season: Season;
  destination: string;
}) => {
  const page = await context.newPage();

  await page.goto(voice.href, { waitUntil: "load" });

  const iframeVideoURL = await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>("pjsdiv video");
    return video?.src;
  });

  if (!iframeVideoURL) {
    logger.error(
      `Failed to get iframeVideoURL for episode "${episode.id}" from season "${season.id}" with voice "${voice.name}"`
    );

    return;
  }

  const fileExtension = iframeVideoURL.split(".").pop();

  if (!fileExtension) {
    logger.error(
      `Failed to get file extension for episode "${episode.id}" from season "${season.id}" with voice "${voice.name}"`
    );

    return;
  }

  const filePath = getEpisodeFilePath({
    destination,
    episode,
    season,
    voice,
    fileExtension,
  });

  await downloadFile({
    URL: iframeVideoURL,
    destination: filePath,
    onProgress: (progress) => {
      if (!(progress.percentage % 5)) {
        logger.info(
          `Downloading episode "${episode.id}" from season "${
            season.id
          }" with voice "${voice.name}": ${progress.percentage}% ${bytes(
            progress.downloadedBytes
          )} / ${bytes(progress.totalBytes)}`
        );
      }
    },
  });

  logger.info(
    `Episode "${episode.id}" from season "${season.id}" with voice "${voice.name}" saved to ${filePath}`
  );

  const subtitleUrl = await page.evaluate(() => {
    const matches = document.documentElement.outerHTML.match(
      /https:\/\/[^\s"']+\.vtt\b/
    );

    return matches ? matches[0] : null;
  });

  if (subtitleUrl) {
    const subtitlesFileExtension = subtitleUrl.split(".").pop();

    if (!subtitlesFileExtension) {
      logger.error(
        `Failed to get subtitles file extension for episode "${episode.id}" from season "${season.id}" with voice "${voice.name}"`
      );

      return;
    }

    const subtitlesPath = getEpisodeFilePath({
      destination,
      episode,
      season,
      voice,
      fileExtension: subtitlesFileExtension,
    });

    const isSubtitlesExists = await fs
      .access(subtitlesPath)
      .then(() => true)
      .catch(() => false);

    if (!isSubtitlesExists) {
      logger.info(
        `Downloading subtitles for episode "${episode.id}" from season "${season.id}" with voice "${voice.name}"`
      );

      await downloadFile({
        URL: subtitleUrl,
        destination: subtitlesPath,
        onProgress: (progress) => {
          if (!(progress.percentage % 10)) {
            logger.info(
              `Downloading subtitles for episode "${episode.id}" from season "${
                season.id
              }" with voice "${voice.name}": ${progress.percentage}% ${bytes(
                progress.downloadedBytes
              )} / ${bytes(progress.totalBytes)}`
            );
          }
        },
      });

      logger.info(
        `Subtitle for episode "${episode.id}" from season "${season.id}" with voice "${voice.name}" downloaded to ${subtitlesPath}`
      );
    }
  }

  await page.close();
};

export const downloadEpisode = async ({
  context,
  episode,
  season,
  destination,
  voicesToDownload,
}: {
  context: BrowserContext;
  episode: Episode;
  season: Season;
  destination: string;
  voicesToDownload?: number[];
}) => {
  const page = await context.newPage();

  await page.goto(episode.href, { waitUntil: "load" });

  const voices = await page.evaluate<Voice[]>(() => {
    const voicesList =
      document.querySelectorAll<HTMLAnchorElement>("#voice h2 a");

    return Array.from(voicesList).reduce((acc, el) => {
      const id = new URL(el.href).searchParams.get("voice") || "";

      if (!id) return acc;

      acc.push({ name: el.textContent?.trim() || "", href: el.href, id });

      return acc;
    }, [] as Voice[]);
  });

  logger.info(
    `Available voices for episode "${episode.id}" from season "${
      season.id
    }": ${voices.map((v) => v.name).toString()}`
  );

  const fileExtension = await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>("pjsdiv video");
    return video?.src.split(".").pop();
  });

  if (!fileExtension) {
    logger.error(
      `Failed to get file extension for episode "${episode.id}" from season "${season.id}"`
    );

    return;
  }

  for (const voice of voices) {
    if (voicesToDownload && !voicesToDownload?.includes(Number(voice.id))) {
      continue;
    }

    const episodeFilePath = getEpisodeFilePath({
      destination,
      episode,
      season,
      voice,
      fileExtension,
    });

    const isFileExists = await checkIsFileExists(episodeFilePath);

    if (isFileExists) {
      logger.info(
        `Episode "${episode.id}" from season "${season.id}" with voice "${voice.name}" already exists at ${episodeFilePath}`
      );

      continue;
    }

    await downloadEpisodeVoice({
      context,
      voice,
      episode,
      season,
      destination,
    });

    const delayTime = 5;

    logger.info(
      `Waiting time before downloading next voice: ${delayTime} seconds`
    );

    await delay(delayTime);
  }

  await page.close();
};
