// Clean DTOs sent to the browser. We never send raw Airtable records to the client.

export interface Person {
  id: string;
  name: string;
  role?: string;
  accessTier?: string;
  valueCap?: number;
  frontDoorKey?: boolean;
}

export interface Safe {
  id: string;
  name: string;
  type?: string;
  location?: string;
  access: string[];
  valueCap?: number;
  notes?: string;
  currentValue: number;
  currentCount: number;
  overCap: boolean;
}

export interface Game {
  id: string;
  number: string;
  title?: string;
  status?: string;
  itemType?: string;
  retailValue?: number;
  listedValue?: number;
  expectedCount?: number;
  actualCount?: number;
  checkVerified?: boolean;
  countCheck?: string;
  highValueDiscrepancy?: string;
  sealId?: string;
  sealStatus?: string;
  returnReason?: string;
  notes?: string;
  currentSafeId?: string;
  currentSafeName?: string;
  showId?: string;
  streamerId?: string;
  streamerName?: string;
  returnedAt?: string;
}

export interface ShowSummary {
  id: string;
  showId: string;
  start?: string;
  platform?: string;
  status?: string;
  streamerName?: string;
  gameIds: string[];
}

export interface Movement {
  id: string;
  type?: string;
  at?: string;
  gameId?: string;
  gameNumber?: string;
  fromSafeName?: string;
  toSafeName?: string;
  movedByName?: string;
  receivedByName?: string;
  notes?: string;
}

export interface DashboardData {
  byStatus: { status: string; count: number; value: number }[];
  byLocation: { location: string; count: number; value: number }[];
  alerts: {
    overCapSafes: Safe[];
    countMismatches: Game[];
    highValueDiscrepancies: Game[];
    returnsOverdue: Game[];
    sealCompromised: Game[];
  };
  websterTotalValue: number;
  totals: { games: number; value: number };
}
