import { Elysia } from "elysia";

import { AppError } from "../../shared/errors/app-error";
import { DockerController } from "./docker.controller";

const dockerController = new DockerController();

export const dockerRoute = new Elysia({
  name: "docker.route",
  prefix: "/docker",
})
  .onError(({ error, set }) => handleDockerError(error, set))
  .get("/containers", () => dockerController.list())
  .get("/containers/stream", ({ request }) =>
    dockerController.streamContainers(request.signal),
  )
  .get("/containers/:id/logs/stream", ({ params, request }) =>
    dockerController.streamLogs(params.id, request.signal),
  )
  .post("/containers/:id/:action", ({ params }) =>
    dockerController.control(params.id, params.action),
  )
  .ws("/containers/:id/exec", {
    close(ws) {
      dockerController.closeExec(ws);
    },
    message(ws, message) {
      dockerController.writeExec(ws, message);
    },
    open(ws) {
      dockerController.openExec(ws, ws.data.params.id, (data) => ws.send(data));
    },
  });

function handleDockerError(error: unknown, set: { status?: number | string }) {
  if (error instanceof AppError) {
    set.status = error.status;

    return {
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error instanceof Error) {
    set.status = 500;

    return {
      error: {
        code: "DOCKER_COMMAND_FAILED",
        message: error.message,
      },
    };
  }

  throw error;
}
