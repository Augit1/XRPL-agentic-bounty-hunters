import fs from "node:fs/promises";
import path from "node:path";
import { Mission, MissionStore } from "../types";

const EMPTY_STORE: MissionStore = { missions: [] };

export class StorageService {
  constructor(private readonly storePath: string) {}

  async ensureStore(): Promise<void> {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });

    try {
      await fs.access(this.storePath);
    } catch {
      await fs.writeFile(this.storePath, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
    }
  }

  async readStore(): Promise<MissionStore> {
    await this.ensureStore();
    const raw = await fs.readFile(this.storePath, "utf8");
    return (JSON.parse(raw) as MissionStore) ?? EMPTY_STORE;
  }

  async writeStore(store: MissionStore): Promise<void> {
    await this.ensureStore();
    await fs.writeFile(this.storePath, JSON.stringify(store, null, 2), "utf8");
  }

  async listMissions(): Promise<Mission[]> {
    const store = await this.readStore();
    return store.missions;
  }

  async saveMission(mission: Mission): Promise<Mission> {
    const store = await this.readStore();
    const index = store.missions.findIndex((existing) => existing.id === mission.id);

    if (index >= 0) {
      store.missions[index] = mission;
    } else {
      store.missions.push(mission);
    }

    await this.writeStore(store);
    return mission;
  }
}
