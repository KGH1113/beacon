import { Elysia } from "elysia";

import { AppError } from "../../shared/errors/app-error";
import { ShareController } from "./share.controller";

const shareController = new ShareController();

export const shareRoute = new Elysia({
  name: "share.route",
  prefix: "/share",
})
  .onError(({ error, set }) => handleShareError(error, set))
  .get("", () => shareController.list())
  .post("/upload", ({ body }) => shareController.upload(body))
  .post("", ({ body }) => shareController.create(body))
  .delete("/:id/file", ({ params }) => shareController.deleteFile(params.id))
  .delete("/:id", ({ params }) => shareController.revoke(params.id));

export const sharePublicRoute = new Elysia({
  name: "share.public.route",
})
  .onError(({ error, set }) => handleShareError(error, set))
  .get("/preview/:token/text", ({ params }) =>
    shareController.previewText(params.token),
  )
  .get("/preview/:token/thumbnail", ({ params }) =>
    shareController.previewThumbnail(params.token),
  )
  .head("/stream/:token", async ({ params, request, set }) => {
    const response = await shareController.previewStreamHead(
      params.token,
      request.headers.get("range"),
    );
    set.status = response.status;
    set.headers = response.headers;
  })
  .get("/stream/:token", ({ params, request }) =>
    shareController.previewStream(params.token, request.headers.get("range")),
  )
  .get("/s/:token", ({ params }) => shareController.download(params.token));

function handleShareError(error: unknown, set: { status?: number | string }) {
  if (error instanceof AppError) {
    set.status = error.status;

    return {
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  throw error;
}
