<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductConversion;
use Illuminate\Http\Request;

class ProductConversionController extends Controller
{
    public function index(Product $product)
    {
        return response()->json($product->conversions);
    }

    public function store(Request $request, Product $product)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'factor' => 'required|numeric|min:0.0001',
            'is_purchase_unit' => 'boolean',
            'is_sale_unit' => 'boolean',
        ]);

        $conversion = $product->conversions()->create($request->all());

        return response()->json($conversion, 201);
    }

    public function update(Request $request, ProductConversion $conversion)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'factor' => 'required|numeric|min:0.0001',
            'is_purchase_unit' => 'boolean',
            'is_sale_unit' => 'boolean',
        ]);

        $conversion->update($request->all());

        return response()->json($conversion->fresh());
    }

    public function destroy(ProductConversion $conversion)
    {
        $conversion->delete();
        return response()->json(['message' => 'Conversión eliminada correctamente.']);
    }
}
