import { loadSeries } from "@/parsers/by-domain/mult-fan.tv";

loadSeries({
  destination: "./data/bobsburgers",
  subdomain: "bobsburgers",
  seasonsToDownload: [7],
});
