import { type ISystemService, SystemService } from "./system.service";

export interface ISystemController {
  getOverview: () => Promise<Record<string, unknown>>;
}

export class SystemController implements ISystemController {
  constructor(private readonly service: ISystemService = new SystemService()) {}

  async getOverview(): Promise<Record<string, unknown>> {
    return this.service.getOverview();
  }
}
