<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(User::orderBy('name')->paginate(20));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|regex:/@erp\.com$/i|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,cashier,supervisor',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|regex:/@erp\.com$/i|unique:users,email,{$user->id}",
            'role' => 'required|in:admin,cashier,supervisor',
        ]);

        $data = $request->only('name', 'email', 'role', 'is_active');

        if ($request->password) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);
        return response()->json($user);
    }

    public function destroy(User $user)
    {
        if ($user->id === request()->user()->id) {
            return response()->json(['message' => 'No puedes eliminarte a ti mismo.'], 409);
        }
        $user->update(['is_active' => false]);
        return response()->json(['message' => 'Usuario desactivado correctamente.']);
    }
}
