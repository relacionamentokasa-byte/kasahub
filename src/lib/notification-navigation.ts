type NavigateFn = (options: { to: any; search?: any }) => void | Promise<void>;

export function notificationNavigationTarget(link: string | null | undefined) {
  if (!link) return null;

  try {
    const url = new URL(link, window.location.origin);
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
    return { to: link, search: undefined };
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