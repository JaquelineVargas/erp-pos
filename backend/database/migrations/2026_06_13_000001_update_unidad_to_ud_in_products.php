<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')->where('base_unit', 'unidad')->update(['base_unit' => 'ud.']);
    }

    public function down(): void
    {
        DB::table('products')->where('base_unit', 'ud.')->update(['base_unit' => 'unidad']);
    }
};
