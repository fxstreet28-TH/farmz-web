// Placeholder art: emoji per item id. Swap for sprites later.
export const EMOJI: Record<string, string> = {
  wheat: "🌾",
  corn: "🌽",
  carrot: "🥕",
  tomato: "🍅",
  strawberry: "🍓",
  chicken: "🐔",
  cow: "🐄",
  sheep: "🐑",
  egg: "🥚",
  milk: "🥛",
  wool: "🧶",
  chicken_feed: "🌰",
  cow_feed: "🌿",
  sheep_feed: "🍀",
};

export const emoji = (id: string | null | undefined) => (id && EMOJI[id]) || "📦";

export const MISSION_EMOJI: Record<string, string> = {
  harvest_crops: "🧺",
  feed_animals: "🥣",
  sell_value: "💰",
  login_streak: "🔥",
  complete_order: "📜",
};

export function missionTitle(kind: string, target: number): string {
  switch (kind) {
    case "harvest_crops":
      return `Harvest ${target} crops`;
    case "feed_animals":
      return `Feed ${target} animals`;
    case "sell_value":
      return `Sell produce worth ${target} coins`;
    case "login_streak":
      return `Log in ${target} days in a row`;
    case "complete_order":
      return `Complete ${target} order${target > 1 ? "s" : ""}`;
    default:
      return kind.replace(/_/g, " ");
  }
}

/** Formats a FARMZ decimal string from the server ("0.500000000000000000" -> "0.5"). */
export const fmtFarmz = (v: string | number) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 });

export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
