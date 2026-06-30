<?php

namespace App\Services;

use App\Models\Permission;
use Illuminate\Support\Facades\Cache;

class PermissionService
{
    protected array $defaultRoles = ['admin', 'cashier', 'supervisor'];

    public function getPermissionsForRole(string $role): array
    {
        return Cache::remember("permissions_role_{$role}", 3600, function () use ($role) {
            return Permission::whereHas('roles', function ($q) use ($role) {
                $q->where('role', $role);
            })->pluck('key')->toArray();
        });
    }

    public function userHasPermission($user, string $permission): bool
    {
        if (!$user) return false;
        if ($user->role === 'admin') return true;
        $perms = $this->getPermissionsForRole($user->role);
        return in_array($permission, $perms);
    }

    public function userHasAnyPermission($user, array $permissions): bool
    {
        foreach ($permissions as $p) {
            if ($this->userHasPermission($user, $p)) return true;
        }
        return false;
    }

    public function userHasRole($user, string|array $roles): bool
    {
        if (is_array($roles)) return in_array($user->role, $roles);
        return $user->role === $roles;
    }

    public function getAllPermissions(): array
    {
        return Permission::orderBy('group')->orderBy('name')->get()->toArray();
    }

    public function clearCache(): void
    {
        foreach ($this->defaultRoles as $role) {
            Cache::forget("permissions_role_{$role}");
        }
    }
}
