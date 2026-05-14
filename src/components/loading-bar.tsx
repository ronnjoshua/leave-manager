"use client";

import { AppProgressBar } from "next-nprogress-bar";

export function LoadingBar() {
  return (
    <AppProgressBar
      height="3px"
      color="oklch(0.55 0.15 165)"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
