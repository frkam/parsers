import { downloadVideos } from "@/parsers/by-domain/mult-fan.tv";

downloadVideos({
  destination: "./data/bobsburgers",
  subdomain: "bobsburgers",
  seasonsToDownload: [7],
});
