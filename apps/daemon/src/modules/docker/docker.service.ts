import {
  type DockerIntegration,
  createDockerIntegration,
} from "../../integrations/docker";
import {
  type PtyIntegration,
  createPtyIntegration,
} from "../../integrations/pty";

export interface IDockerService {
  listContainers: () => Promise<unknown[]>;
}

export class DockerService implements IDockerService {
  constructor(
    private readonly integration: DockerIntegration = createDockerIntegration(),
    private readonly pty: PtyIntegration = createPtyIntegration(),
  ) {}

  async listContainers(): Promise<unknown[]> {
    void this.integration;
    void this.pty;

    return [];
  }
}
