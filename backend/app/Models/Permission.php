<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = ['key', 'name', 'group'];

    public function roles()
    {
        return $this->hasMany(RolePermission::class, 'permission_id');
    }
}
