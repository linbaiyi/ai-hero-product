export type BackendHealthResponse = {
  status: string;
  service: string;
  version: string;
};

export type BackendConnectionStatus =
  | "idle"
  | "checking"
  | "connected"
  | "failed";
