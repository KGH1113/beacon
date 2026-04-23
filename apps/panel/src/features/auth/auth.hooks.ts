"use client";

import { useAuthStore } from "./auth.store";

export function useLoginForm() {
  const passwordVisible = useAuthStore((state) => state.passwordVisible);
  const setPasswordVisible = useAuthStore((state) => state.setPasswordVisible);

  return {
    passwordVisible,
    setPasswordVisible,
  };
}
