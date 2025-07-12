import { loadSeries } from "@/parsers/by-domain/mult-fan.tv";

loadSeries({
  destination: "./data",
  subdomain: "bobsburgers",
  seasonsToLoad: [7],
});
