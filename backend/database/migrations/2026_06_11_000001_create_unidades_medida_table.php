<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('unidades_medida');
        Schema::create('unidades_medida', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('symbol', 20)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unidades_medida');
    }
};
