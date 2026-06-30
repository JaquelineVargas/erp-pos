<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->merge([
            'email' => trim($request->email ?? ''),
        ]);

        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:1',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales incorrectas.',
                'errors' => ['email' => ['El correo o la contraseña no son correctos.']],
            ], 422);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario desactivado.',
                'errors' => ['email' => ['Esta cuenta ha sido desactivada. Contacta al administrador.']],
            ], 422);
        }

        $token = $user->createToken('erp-pos-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $user,
            'permissions' => $user->permissions,
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'admin',
        ]);

        $token = $user->createToken('erp-pos-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
            'permissions' => $user->permissions,
        ], 201);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        $hasOpenArqueo = \App\Models\Arqueo::where('user_id', $user->id)
            ->where('state', 'pending')
            ->exists();

        if ($hasOpenArqueo) {
            return response()->json([
                'message' => 'No puedes cerrar sesión sin cerrar el arqueo primero.',
            ], 409);
        }

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada correctamente.']);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'user' => $user,
            'permissions' => $user->permissions,
        ]);
    }
}
