import type { GetSystemOverviewOutput } from "@beacon/shared";

import { type ISystemService, SystemService } from "./system.service";

export interface ISystemController {
  getOverview: () => Promise<GetSystemOverviewOutput>;
}

export class SystemController implements ISystemController {
  constructor(private readonly service: ISystemService = new SystemService()) {}

  async getOverview(): Promise<GetSystemOverviewOutput> {
    return this.service.getOverview();
  }
}
