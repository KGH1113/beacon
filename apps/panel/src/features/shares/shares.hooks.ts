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
  const finishUploadProgress = useSharesStore(
    (state) => state.finishUploadProgress,
  );
  const isUploading = useSharesStore(
    (state) => state.isUploadProgressVisible && state.uploadProgress < 100,
  );
  const progress = useSharesStore((state) => state.uploadProgress);
  const setUploadProgress = useSharesStore((state) => state.setUploadProgress);
  const startUploadProgress = useSharesStore(
    (state) => state.startUploadProgress,
  );

  async function uploadFiles(files: FileList | File[]) {
    const uploadTargets = Array.from(files);

    if (uploadTargets.length === 0) {
      return;
    }

    startUploadProgress();

    try {
      for (let index = 0; index < uploadTargets.length; index += 1) {
        const share = await uploadShareFile({
          daemonUploadBaseUrl,
          file: uploadTargets[index],
          onProgress: (fileProgress) => {
            const completed = index / uploadTargets.length;
            const current = fileProgress / uploadTargets.length;
            setUploadProgress(Math.round((completed + current) * 100));
          },
        });

        onShareUploaded(share);
        toast.success("Share uploaded", {
          description: share.fileName,
        });
      }

      finishUploadProgress();
    } finally {
      if (useSharesStore.getState().uploadProgress < 100) {
        useSharesStore.setState({
          isUploadProgressVisible: false,
          uploadProgress: 0,
        });
      }
    }
  }

  return {
    isUploading,
    progress,
    uploadFiles,
  };
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
