import {
  type DockerContainerDto,
  type DockerContainersRealtimeEventDto,
  DockerContainersRealtimeEventDtoSchema,
} from "@beacon/shared";

type DockerRealtimeListener = (event: DockerContainersRealtimeEventDto) => void;

export interface DockerRealtimeBroadcaster {
  publishSnapshot: (containers: DockerContainerDto[]) => void;
  subscribe: (listener: DockerRealtimeListener) => () => void;
}

class InMemoryDockerRealtimeBroadcaster implements DockerRealtimeBroadcaster {
  private readonly listeners = new Set<DockerRealtimeListener>();

  subscribe(listener: DockerRealtimeListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  publishSnapshot(containers: DockerContainerDto[]) {
    const event = DockerContainersRealtimeEventDtoSchema.parse({
      type: "docker.containers.snapshot",
      timestamp: new Date().toISOString(),
      payload: { containers },
    });

    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const dockerRealtimeBroadcaster: DockerRealtimeBroadcaster =
  new InMemoryDockerRealtimeBroadcaster();
