<?php

namespace App\Http\Middleware;

use App\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;

class CheckPermission
{
    public function __construct(protected PermissionService $permissionService) {}

    public function handle(Request $request, Closure $next, string ...$permissions)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if ($user->role === 'admin') {
            return $next($request);
        }

        foreach ($permissions as $permission) {
            if ($this->permissionService->userHasPermission($user, $permission)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'No tienes permiso para realizar esta acción.'], 403);
    }
}
