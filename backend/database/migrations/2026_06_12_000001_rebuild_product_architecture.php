<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('product_returnables');
        Schema::dropIfExists('product_conversions');
        Schema::dropIfExists('product_batches');
        Schema::dropIfExists('products');

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code', 50)->unique()->nullable();
            $table->string('sku', 100)->unique()->nullable();
            $table->string('barcode')->unique()->nullable();
            $table->string('name');
            $table->string('brand', 255)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('inventory_type', 20)->default('unit');
            $table->string('base_unit', 20)->nullable();
            $table->decimal('purchase_price', 10, 2)->default(0);
            $table->decimal('selling_price', 10, 2);
            $table->decimal('tax', 5, 2)->default(0);
            $table->decimal('current_stock', 12, 3)->default(0);
            $table->decimal('min_stock', 12, 3)->default(0);
            $table->boolean('track_stock')->default(true);
            $table->boolean('track_batches')->default(false);
            $table->boolean('track_expiration')->default(false);
            $table->boolean('track_conversions')->default(false);
            $table->boolean('track_returnable')->default(false);
            $table->string('batch_generation', 10)->nullable();
            $table->integer('expiration_alert_days')->default(30);
            $table->boolean('is_active')->default(true);
            $table->string('image')->nullable();
            $table->timestamps();
        });

        Schema::create('product_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->decimal('factor', 12, 4);
            $table->boolean('is_purchase_unit')->default(false);
            $table->boolean('is_sale_unit')->default(false);
            $table->timestamps();
        });

        Schema::create('product_returnables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('container_name', 100);
            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->decimal('available_quantity', 12, 3)->default(0);
            $table->timestamps();
        });

        Schema::create('product_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('batch_code', 100);
            $table->date('expiration_date')->nullable();
            $table->decimal('current_quantity', 12, 3)->default(0);
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['product_id', 'batch_code']);
            $table->index(['product_id', 'expiration_date']);
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('product_batches')->nullOnDelete();
            $table->string('type', 20);
            $table->decimal('quantity', 12, 3);
            $table->decimal('stock_before', 12, 3);
            $table->decimal('stock_after', 12, 3);
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('conversion_id')->nullable()->constrained('product_conversions')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index('product_id');
            $table->index('type');
            $table->index(['reference_type', 'reference_id']);
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 12, 3);
            $table->decimal('price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->decimal('cost', 10, 2)->nullable();
            $table->foreignId('conversion_id')->nullable()->constrained('product_conversions')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('product_returnables');
        Schema::dropIfExists('product_conversions');
        Schema::dropIfExists('product_batches');
        Schema::dropIfExists('products');
    }
};
