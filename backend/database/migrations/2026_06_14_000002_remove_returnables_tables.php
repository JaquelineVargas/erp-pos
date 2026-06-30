<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('product_returnables');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('track_returnable');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('track_returnable')->default(false);
        });

        Schema::create('product_returnables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('container_name');
            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->decimal('available_quantity', 10, 3)->default(0);
            $table->timestamps();
        });
    }
};
