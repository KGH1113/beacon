import { DockerService, type IDockerService } from "./docker.service";

export interface IDockerController {
  list: () => Promise<unknown[]>;
}

export class DockerController implements IDockerController {
  constructor(private readonly service: IDockerService = new DockerService()) {}

  async list(): Promise<unknown[]> {
    return this.service.listContainers();
  }
}
