// Shapes returned by the FarmZ edge functions (see backend `game_state` RPC and econ_* functions).

export interface Plot {
  id: string;
  farm_id: string;
  slot: number;
  crop_id: string | null;
  planted_at: string | null;
  ready_at: string | null;
  state: "empty" | "growing" | "ready";
}

export interface Animal {
  id: string;
  farm_id: string;
  type: string;
  fed_at: string | null;
  produce_ready_at: string | null;
  created_at: string;
}

export interface InventoryItem {
  item: string;
  qty: number;
  cap: number | null;
}

export interface Mission {
  mission_id: string;
  template: string;
  kind: "harvest_crops" | "feed_animals" | "sell_value" | "login_streak" | "complete_order" | string;
  progress: number;
  target: number;
  completed: boolean;
  reward_coin: number;
  reward_farmz: string;
}

export interface GameState {
  server_time: string;
  player: {
    id: string;
    wallet: string;
    coin_balance: number;
    claimable_farmz: string;
    xp: number;
    level: number;
    login_streak: number;
  };
  farm: { id: string; level: number; grid_size: number } | null;
  plots: Plot[];
  animals: Animal[];
  inventory: InventoryItem[];
  missions: Mission[];
}

export interface CropConfig {
  name: string;
  seedPrice: number;
  growSeconds: number;
  yield: number;
  sellPrice: number;
  xp: number;
  minLevel: number;
}

export interface AnimalConfig {
  name: string;
  price: number;
  maxOwned: number;
  minLevel: number;
  feedItem: string;
  feedQty: number;
  produceSeconds: number;
  produce: string;
  produceQty: number;
  xp: number;
}

export interface OrderConfig {
  name: string;
  items: Record<string, number>;
  rewardCoin: number;
  rewardXp: number;
}

export interface GameConfig {
  crops: Record<string, CropConfig>;
  animals: Record<string, AnimalConfig>;
  shop: Record<string, { name: string; price: number; minLevel: number }>;
  sellPrices: Record<string, number>;
  orders: Record<string, OrderConfig>;
  claim: {
    chainId: number;
    farmzToken: string;
    farmzClaim: string;
    signer: string | null;
    maxPerClaim: number;
    minPerClaim: number;
    cooldownSeconds: number;
  };
}

export interface CompletedMission {
  mission_id: string;
  template: string;
  reward_coin: number;
  reward_farmz: string;
}

export interface ClaimTicket {
  pending?: boolean;
  claimId: string;
  account: string;
  amount: string;
  amountWei: string;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
  chainId: number;
  contract: string;
}
