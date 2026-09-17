type NavigateFn = (options: { to: any; search?: any }) => void | Promise<void>;

export function notificationNavigationTarget(link: string | null | undefined) {
  if (!link) return null;

  try {
    const rawLink = link.startsWith("/") || link.startsWith("http") ? link : `/${link}`;
    const origin = globalThis.location?.origin || "http://localhost";
    const url = new URL(rawLink, origin);
    const search = Object.fromEntries(url.searchParams.entries());

    if (url.pathname === "/jobs") {
      const jobId = search.openJobId || search.jobId;
      if (jobId) {
        search.openJobId = jobId;
        delete search.jobId;
      }
    }

    return {
      to: url.pathname || "/",
      search: Object.keys(search).length > 0 ? search : undefined,
    };
  } catch {
    const cleanPath = link.startsWith("/") ? link : `/${link}`;
    return { to: cleanPath, search: undefined };
  }
}

export function navigateToNotificationLink(navigate: NavigateFn, link: string | null | undefined) {
  const target = notificationNavigationTarget(link);
  if (!target) return;

  if (target.search) {
    navigate({ to: target.to, search: target.search });
    return;
  }

  navigate({ to: target.to });
}