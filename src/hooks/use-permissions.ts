import { useQuery } from "@tanstack/react-query";
import { fetchMyPermissions, canAccess, type ModuleId, type ActionId, type PermissionMap } from "@/lib/permissions-api";
import { fetchCurrentUserRoles, hasAnyRole } from "@/lib/roles-api";

export function usePermissions() {
  const { data: perms = {} as PermissionMap, isLoading: permsLoading, isError: permsError } = useQuery({
    queryKey: ["permissions", "me"],
    queryFn: fetchMyPermissions,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: roles = [], isLoading: rolesLoading, isError: rolesError } = useQuery({
    queryKey: ["roles", "me"],
    queryFn: fetchCurrentUserRoles,
    staleTime: 60_000,
    retry: 1,
  });

  const isAdmin = hasAnyRole(roles, ["admin", "ceo"]);
  const isLoading = permsLoading || rolesLoading;
  const isError = permsError || rolesError;

  return {
    perms,
    isLoading,
    isError,
    isAdmin,
    can: (module: ModuleId, action: ActionId = "view") =>
      isAdmin || canAccess(perms, module, action),
  };
}
