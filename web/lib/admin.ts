import { api } from "./api";

export async function fetchServerLogs(): Promise<string[]> {
  return api.get<string[]>("/admin/logs");
}
