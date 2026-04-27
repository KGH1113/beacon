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
  .get("/stream/:token", ({ params }) =>
    shareController.previewStream(params.token),
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
