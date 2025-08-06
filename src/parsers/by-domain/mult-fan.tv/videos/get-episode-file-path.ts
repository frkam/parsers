import path from "node:path";
import { Episode, Season, Voice } from "./types";

export const getEpisodeFileName = ({
  episode,
  fileExtension,
}: {
  episode: Episode;
  fileExtension?: string;
}) => {
  const episodeNumber = episode.id.toString().padStart(4, "0").slice(-2);

  if (!fileExtension) {
    return `${episodeNumber}_${episode.name}`;
  }

  return `${episodeNumber}_${episode.name}.${fileExtension}`;
};

export const getEpisodeFilePath = ({
  destination,
  episode,
  season,
  voice,
  fileExtension,
}: {
  episode: Episode;
  season: Season;
  voice: Voice;
  destination: string;
  fileExtension?: string;
}) => {
  const fileName = getEpisodeFileName({ episode, fileExtension });

  return path.join(destination, `/S${season.id}`, `/${voice.name}`, fileName);
};
