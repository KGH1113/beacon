import { type IMinecraftService, MinecraftService } from "./minecraft.service";

export interface IMinecraftController {
  list: () => Promise<unknown[]>;
}

export class MinecraftController implements IMinecraftController {
  constructor(
    private readonly service: IMinecraftService = new MinecraftService(),
  ) {}

  async list(): Promise<unknown[]> {
    return this.service.listServers();
  }
}
