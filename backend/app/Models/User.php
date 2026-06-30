<?php

namespace App\Models;

use App\Services\PermissionService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'timezone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function cashRegisters()
    {
        return $this->hasMany(CashRegister::class);
    }

    public function arqueos()
    {
        return $this->hasMany(Arqueo::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function hasPermission(string $permission): bool
    {
        return app(PermissionService::class)->userHasPermission($this, $permission);
    }

    public function hasAnyPermission(array $permissions): bool
    {
        return app(PermissionService::class)->userHasAnyPermission($this, $permissions);
    }

    public function hasRole(string|array $roles): bool
    {
        return app(PermissionService::class)->userHasRole($this, $roles);
    }

    public function getPermissionsAttribute()
    {
        return app(PermissionService::class)->getPermissionsForRole($this->role);
    }

    public function hasOpenCashRegister(): bool
    {
        return $this->cashRegisters()->where('status', 'open')->exists();
    }
}
