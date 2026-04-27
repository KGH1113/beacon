"use client";

import type { ShareDto } from "@beacon/shared";
import { toast } from "sonner";

import { mockShares } from "./shares.lib";
import { UploadShareOutputSchema } from "./shares.schema";
import { useSharesStore } from "./shares.store";

export function useShares() {
  return {
    data: mockShares,
    isLoading: false,
    error: null,
  };
}

export function useCreateShare() {
  return {
    isPending: false,
  };
}

type ShareUploadOptions = {
  daemonUploadBaseUrl: string;
  onShareUploaded: (share: ShareDto) => void;
};

export function useShareUpload({
  daemonUploadBaseUrl,
  onShareUploaded,
}: ShareUploadOptions) {
  const failUploadProgress = useSharesStore(
    (state) => state.failUploadProgress,
  );
  const finishUploadProgress = useSharesStore(
    (state) => state.finishUploadProgress,
  );
  const setUploadProgress = useSharesStore((state) => state.setUploadProgress);
  const startUploadProgress = useSharesStore(
    (state) => state.startUploadProgress,
  );
  const uploadProgressItems = useSharesStore(
    (state) => state.uploadProgressItems,
  );

  async function uploadFiles(files: FileList | File[]) {
    const uploadTargets = Array.from(files);

    if (uploadTargets.length === 0) {
      return;
    }

    await Promise.allSettled(
      uploadTargets.map(async (file, index) => {
        const uploadId = createUploadId(file, index);
        startUploadProgress({
          fileName: file.name,
          id: uploadId,
          progress: 0,
        });

        const share = await uploadShareFile({
          daemonUploadBaseUrl,
          file,
          onProgress: (fileProgress) => {
            setUploadProgress(uploadId, Math.round(fileProgress * 100));
          },
        }).catch((error) => {
          failUploadProgress(uploadId);
          toast.error("Upload failed", {
            description: file.name,
          });

          throw error;
        });

        onShareUploaded(share);
        finishUploadProgress(uploadId);
        toast.success("Share uploaded", {
          description: share.fileName,
        });
      }),
    );
  }

  return {
    isUploading: uploadProgressItems.length > 0,
    progress: uploadProgressItems,
    uploadFiles,
  };
}

function createUploadId(file: File, index: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${index}-${file.name}`;
}

function uploadShareFile({
  daemonUploadBaseUrl,
  file,
  onProgress,
}: {
  daemonUploadBaseUrl: string;
  file: File;
  onProgress: (progress: number) => void;
}) {
  return new Promise<ShareDto>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.set("file", file);

    request.open(
      "POST",
      new URL("/api/v1/share/upload", daemonUploadBaseUrl).toString(),
    );

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(event.loaded / event.total);
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("Upload failed."));
        return;
      }

      const parsed = UploadShareOutputSchema.safeParse(parseJsonResponseText());

      if (!parsed.success) {
        reject(new Error("Invalid upload response."));
        return;
      }

      resolve(parsed.data.share);
    };

    request.onerror = () => {
      reject(new Error("Upload failed."));
    };

    request.send(formData);

    function parseJsonResponseText() {
      try {
        return JSON.parse(request.responseText);
      } catch {
        return null;
      }
    }
  });
}
