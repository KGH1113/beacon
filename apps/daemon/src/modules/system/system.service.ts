import {
  type SystemIntegration,
  createSystemIntegration,
} from "../../integrations/system";

export interface ISystemService {
  getOverview: () => Promise<Record<string, unknown>>;
}

export class SystemService implements ISystemService {
  constructor(
    private readonly integration: SystemIntegration = createSystemIntegration(),
  ) {}

  async getOverview(): Promise<Record<string, unknown>> {
    void this.integration;

    return {};
  }
}
