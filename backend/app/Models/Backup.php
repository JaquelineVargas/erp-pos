<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Backup extends Model
{
    protected $fillable = [
        'filename', 'path', 'type', 'format', 'size', 'user_id', 'notes',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
