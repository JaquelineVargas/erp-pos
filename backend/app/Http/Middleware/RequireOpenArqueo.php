<?php

namespace App\Http\Middleware;

use App\Models\Arqueo;
use Closure;
use Illuminate\Http\Request;

class RequireOpenArqueo
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $hasOpen = Arqueo::where('user_id', $user->id)
            ->where('state', 'pending')
            ->exists();

        if (!$hasOpen) {
            return response()->json([
                'message' => 'Debes abrir un arqueo antes de realizar ventas.',
            ], 403);
        }

        return $next($request);
    }
}
