"use client";

import type { ShareDto } from "@beacon/shared";
import { useState } from "react";

import { mockShares } from "./shares.lib";
import { UploadShareOutputSchema } from "./shares.schema";

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
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadFiles(files: FileList | File[]) {
    const uploadTargets = Array.from(files);

    if (uploadTargets.length === 0) {
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      for (let index = 0; index < uploadTargets.length; index += 1) {
        const share = await uploadShareFile({
          daemonUploadBaseUrl,
          file: uploadTargets[index],
          onProgress: (fileProgress) => {
            const completed = index / uploadTargets.length;
            const current = fileProgress / uploadTargets.length;
            setProgress(Math.round((completed + current) * 100));
          },
        });

        onShareUploaded(share);
      }

      setProgress(100);
    } finally {
      setIsUploading(false);
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
