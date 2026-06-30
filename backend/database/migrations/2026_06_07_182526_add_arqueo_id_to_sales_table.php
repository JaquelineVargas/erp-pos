<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('sales', 'arqueo_id')) {
            Schema::table('sales', function (Blueprint $table) {
                $table->foreignId('arqueo_id')->nullable()->constrained('arqueos')->nullOnDelete()->after('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['arqueo_id']);
            $table->dropColumn('arqueo_id');
        });
    }
};
