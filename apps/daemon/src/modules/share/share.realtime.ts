import {
  type ListSharesOutput,
  type ShareDto,
  type ShareRealtimeEventDto,
  ShareRealtimeEventDtoSchema,
} from "@beacon/shared";

type ShareRealtimeListener = (event: ShareRealtimeEventDto) => void;

export interface ShareRealtimeBroadcaster {
  publishDelete: (shareId: string) => void;
  publishSnapshot: (payload: ListSharesOutput) => void;
  publishUpsert: (share: ShareDto) => void;
  subscribe: (listener: ShareRealtimeListener) => () => void;
}

class InMemoryShareRealtimeBroadcaster implements ShareRealtimeBroadcaster {
  private readonly listeners = new Set<ShareRealtimeListener>();

  subscribe(listener: ShareRealtimeListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  publishSnapshot(payload: ListSharesOutput) {
    this.publish({
      type: "share.snapshot",
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  publishUpsert(share: ShareDto) {
    this.publish({
      type: "share.upsert",
      timestamp: new Date().toISOString(),
      payload: { share },
    });
  }

  publishDelete(shareId: string) {
    this.publish({
      type: "share.delete",
      timestamp: new Date().toISOString(),
      payload: { shareId },
    });
  }

  private publish(event: ShareRealtimeEventDto) {
    const parsed = ShareRealtimeEventDtoSchema.parse(event);

    for (const listener of this.listeners) {
      listener(parsed);
    }
  }
}

export const shareRealtimeBroadcaster: ShareRealtimeBroadcaster =
  new InMemoryShareRealtimeBroadcaster();
