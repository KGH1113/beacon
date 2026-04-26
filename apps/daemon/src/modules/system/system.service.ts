import {
  type GetSystemOverviewOutput,
  GetSystemOverviewOutputSchema,
} from "@beacon/shared";

import {
  type SystemIntegration,
  createSystemIntegration,
} from "../../integrations/system";

export interface ISystemService {
  getOverview: () => Promise<GetSystemOverviewOutput>;
}

export class SystemService implements ISystemService {
  constructor(
    private readonly integration: SystemIntegration = createSystemIntegration(),
  ) {}

  async getOverview(): Promise<GetSystemOverviewOutput> {
    const overview = await this.integration.readOverview();

    return GetSystemOverviewOutputSchema.parse({ overview });
  }
}
