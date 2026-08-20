import type { Onboarding } from "@/lib/onboarding-api";

export async function exportOnboardingPDF(onboarding: Onboarding) {
  const { exportOnboardingPDF: realExport } = await import("./onboarding-pdf-real");
  return realExport(onboarding);
}
