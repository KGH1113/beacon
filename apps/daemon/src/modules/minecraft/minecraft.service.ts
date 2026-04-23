import {
  type MinecraftIntegration,
  createMinecraftIntegration,
} from "../../integrations/minecraft";

export interface IMinecraftService {
  listServers: () => Promise<unknown[]>;
}

export class MinecraftService implements IMinecraftService {
  constructor(
    private readonly integration: MinecraftIntegration = createMinecraftIntegration(),
  ) {}

  async listServers(): Promise<unknown[]> {
    void this.integration;

    return [];
  }
}
