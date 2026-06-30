<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('arqueo_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('arqueo_id')->constrained('arqueos')->cascadeOnDelete();
            $table->string('type'); // cash_sale, card_sale, transfer_sale, qr_sale, manual_income, expense, withdrawal, return, void
            $table->string('payment_method')->nullable();
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->text('description')->nullable();
            $table->decimal('amount', 10, 2);
            $table->timestamps();

            $table->index('arqueo_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arqueo_movements');
    }
};
