<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->decimal('expected_amount', 10, 2)->nullable()->after('final_amount');
            $table->decimal('difference', 10, 2)->nullable()->after('expected_amount');
            $table->integer('sales_count')->default(0)->after('difference');
            $table->json('payment_methods_breakdown')->nullable()->after('sales_count');
        });
    }

    public function down(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropColumn(['expected_amount', 'difference', 'sales_count', 'payment_methods_breakdown']);
        });
    }
};
