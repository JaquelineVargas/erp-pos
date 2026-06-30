<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('arqueos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('initial_amount', 10, 2)->default(0);
            $table->decimal('final_amount', 10, 2)->nullable();
            $table->decimal('expected_cash', 10, 2)->nullable();
            $table->decimal('cash_difference', 10, 2)->nullable();
            $table->string('state')->default('pending'); // pending, cuadrado, sobrante, faltante
            $table->decimal('cash_sales', 10, 2)->default(0);
            $table->decimal('card_sales', 10, 2)->default(0);
            $table->decimal('transfer_sales', 10, 2)->default(0);
            $table->decimal('qr_sales', 10, 2)->default(0);
            $table->decimal('manual_income', 10, 2)->default(0);
            $table->decimal('expenses', 10, 2)->default(0);
            $table->decimal('return_total', 10, 2)->default(0);
            $table->decimal('void_total', 10, 2)->default(0);
            $table->integer('total_sales_count')->default(0);
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('coin_breakdown')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arqueos');
    }
};
