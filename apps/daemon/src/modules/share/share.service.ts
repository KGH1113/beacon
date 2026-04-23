import { type ShareRepository, createShareRepository } from "@beacon/db";

export interface IShareService {
  listShares: () => Promise<unknown[]>;
  createShare: (input: unknown) => Promise<unknown>;
}

export class ShareService implements IShareService {
  constructor(
    private readonly repository: ShareRepository = createShareRepository(),
  ) {}

  async listShares(): Promise<unknown[]> {
    return this.repository.list();
  }

  async createShare(input: unknown): Promise<unknown> {
    return this.repository.create(input as never);
  }
}
