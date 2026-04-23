export interface IHealthController {
  getStatus: () => {
    ok: boolean;
    service: "daemon";
  };
}

export class HealthController implements IHealthController {
  getStatus() {
    return {
      ok: true,
      service: "daemon" as const,
    };
  }
}
