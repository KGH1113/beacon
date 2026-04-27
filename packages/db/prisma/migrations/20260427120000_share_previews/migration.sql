ALTER TABLE "Share" ADD COLUMN "previewKind" TEXT;
ALTER TABLE "Share" ADD COLUMN "previewStatus" TEXT NOT NULL DEFAULT 'unavailable';
ALTER TABLE "Share" ADD COLUMN "thumbnailPath" TEXT;
ALTER TABLE "Share" ADD COLUMN "streamPath" TEXT;
ALTER TABLE "Share" ADD COLUMN "textPreviewPath" TEXT;
