<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->json('applied_promotions')->nullable()->after('discount_amount');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('cost', 10, 2)->nullable()->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('applied_promotions');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn('cost');
        });
    }
};
