import { useQuery } from "@tanstack/react-query";
import { fetchMyPermissions, canAccess, type ModuleId, type ActionId, type PermissionMap } from "@/lib/permissions-api";
import { fetchCurrentUserRoles, hasAnyRole } from "@/lib/roles-api";

export function usePermissions() {
  const { data: perms = {} as PermissionMap, isLoading } = useQuery({
    queryKey: ["permissions", "me"],
    queryFn: fetchMyPermissions,
    staleTime: 60_000,
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["roles", "me"],
    queryFn: fetchCurrentUserRoles,
    staleTime: 60_000,
  });
  const isAdmin = hasAnyRole(roles, ["admin", "ceo"]);

  return {
    perms,
    isLoading,
    isAdmin,
    can: (module: ModuleId, action: ActionId = "view") =>
      isAdmin || canAccess(perms, module, action),
  };
}
