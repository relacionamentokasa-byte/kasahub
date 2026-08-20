import type { Onboarding } from "@/lib/onboarding-api";

export async function exportOnboardingPdf(onboarding: Onboarding) {
  const { exportOnboardingPdf: real } = await import("./onboarding-pdf-real");
  return real(onboarding);
}
