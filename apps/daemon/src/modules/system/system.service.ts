import {
  type GetSystemOverviewOutput,
  GetSystemOverviewOutputSchema,
  type SystemOverviewRealtimeEventDto,
  SystemOverviewRealtimeEventDtoSchema,
} from "@beacon/shared";

import {
  type SystemIntegration,
  createSystemIntegration,
} from "../../integrations/system";

export interface ISystemService {
  getOverview: () => Promise<GetSystemOverviewOutput>;
  getOverviewRealtimeEvent: () => Promise<SystemOverviewRealtimeEventDto>;
}

export class SystemService implements ISystemService {
  constructor(
    private readonly integration: SystemIntegration = createSystemIntegration(),
  ) {}

  async getOverview(): Promise<GetSystemOverviewOutput> {
    const overview = await this.integration.readOverview();

    return GetSystemOverviewOutputSchema.parse({ overview });
  }

  async getOverviewRealtimeEvent(): Promise<SystemOverviewRealtimeEventDto> {
    const overview = await this.integration.readOverview();

    return SystemOverviewRealtimeEventDtoSchema.parse({
      type: "system.overview",
      timestamp: new Date().toISOString(),
      payload: overview,
    });
  }
}
