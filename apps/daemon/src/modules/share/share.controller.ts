import { type IShareService, ShareService } from "./share.service";

export interface IShareController {
  list: () => Promise<unknown[]>;
}

export class ShareController implements IShareController {
  constructor(private readonly service: IShareService = new ShareService()) {}

  async list(): Promise<unknown[]> {
    return this.service.listShares();
  }
}
