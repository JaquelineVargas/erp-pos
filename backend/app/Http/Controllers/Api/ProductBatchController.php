<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductBatch;
use Illuminate\Http\Request;

class ProductBatchController extends Controller
{
    public function index(Product $product)
    {
        return response()->json(
            $product->batches()
                ->orderBy('expiration_date')
                ->orderBy('batch_code')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $product = Product::findOrFail($request->product_id);
        $isDecimal = $product->is_weight_or_volume;

        $rules = [
            'product_id' => 'required|exists:products,id',
            'batch_code' => 'nullable|string|max:100',
            'expiration_date' => $product->track_expiration ? 'required|date' : 'nullable|date',
            'current_quantity' => $isDecimal
                ? 'required|numeric|min:0'
                : 'required|integer|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ];

        $data = $request->validate($rules);

        if ($product->batch_generation === 'auto' || empty($data['batch_code'])) {
            $lastBatch = ProductBatch::where('product_id', $product->id)
                ->orderBy('id', 'desc')
                ->first();
            $nextNum = $lastBatch ? ((int) filter_var($lastBatch->batch_code, FILTER_SANITIZE_NUMBER_INT)) + 1 : 1;
            $data['batch_code'] = 'LOTE-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
        }

        $existing = ProductBatch::where('product_id', $product->id)
            ->where('batch_code', $data['batch_code'])
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Ya existe un lote con ese código para este producto.'], 409);
        }

        $batch = ProductBatch::create($data);
        $product->increment('current_stock', $request->current_quantity);

        return response()->json($batch, 201);
    }

    public function update(Request $request, ProductBatch $productBatch)
    {
        $product = $productBatch->product;
        $isDecimal = $product->is_weight_or_volume;

        $rules = [
            'batch_code' => 'required|string|max:100',
            'expiration_date' => $product->track_expiration ? 'required|date' : 'nullable|date',
            'current_quantity' => $isDecimal
                ? 'required|numeric|min:0'
                : 'required|integer|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ];

        $data = $request->validate($rules);

        $diff = $data['current_quantity'] - $productBatch->current_quantity;
        $productBatch->update($data);

        if ($diff != 0) {
            $productBatch->product()->increment('current_stock', $diff);
        }

        return response()->json($productBatch->fresh());
    }

    public function destroy(ProductBatch $productBatch)
    {
        $productBatch->product()->decrement('current_stock', $productBatch->current_quantity);
        $productBatch->delete();
        return response()->json(['message' => 'Lote eliminado correctamente.']);
    }
}
