<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('discount_type')->nullable()->after('tax');
            $table->decimal('discount_value', 10, 2)->default(0)->after('discount_type');
            $table->decimal('discount_amount', 10, 2)->default(0)->after('discount_value');
            $table->decimal('received_amount', 10, 2)->nullable()->after('discount_amount');
            $table->decimal('change', 10, 2)->nullable()->after('received_amount');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_value', 'discount_amount', 'received_amount', 'change']);
        });
    }
};
