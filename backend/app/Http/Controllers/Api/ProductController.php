<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category', 'batches', 'conversions')
            ->select('products.*')
            ->selectRaw('COALESCE((
                SELECT SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0)
                FROM inventory_movements
                WHERE product_id = products.id
                AND type IN ("purchase", "manual_in")
                AND unit_cost IS NOT NULL AND unit_cost > 0
            ), products.purchase_price, 0) as average_cost');

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('internal_code', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%");
            });
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->inventory_type) {
            $query->where('inventory_type', $request->inventory_type);
        }

        if ($request->is_active) {
            $query->where('is_active', true);
        }

        if ($request->low_stock) {
            $query->where('track_stock', true)
                  ->whereColumn('current_stock', '<=', 'min_stock');
        }

        if ($request->batch_expiry === 'expired') {
            $query->whereHas('batches', fn($q) =>
                $q->where('expiration_date', '<', now())
            );
        }

        if ($request->batch_expiry === 'expiring_soon') {
            $query->whereHas('batches', fn($q) =>
                $q->whereBetween('expiration_date', [now(), now()->addDays(30)])
            );
        }

        $query->orderBy('name');

        return response()->json($query->paginate($request->per_page ?? 20));
    }

    public function store(Request $request)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:100|unique:products,sku',
            'barcode' => 'nullable|string|unique:products,barcode',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'inventory_type' => 'required|in:unit,weight,volume',
            'purchase_price' => 'nullable|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'current_stock' => 'nullable|numeric|min:0',
            'min_stock' => 'nullable|numeric|min:0',
            'track_stock' => 'boolean',
            'track_batches' => 'boolean',
            'track_conversions' => 'boolean',
            'batch_generation' => 'nullable|in:manual,auto',
            'expiration_alert_days' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
            'initial_batch_stock' => 'nullable|numeric|min:0',
            'initial_batch_cost' => 'nullable|numeric|min:0',
            'initial_batch_notes' => 'nullable|string|max:500',
        ];

        $validated = $request->validate($rules);

        if (!empty($validated['track_batches'])) {
            $validated['current_stock'] = $request->initial_batch_stock ?? 0;
        }

        $product = Product::create($validated);

        if (!empty($request->initial_batch_code) && !empty($request->initial_batch_expiration)) {
            $product->batches()->create([
                'batch_code' => $request->initial_batch_code,
                'expiration_date' => $request->initial_batch_expiration,
                'current_quantity' => $request->initial_batch_stock ?? $validated['current_stock'] ?? 0,
                'unit_cost' => $request->initial_batch_cost ?? $validated['purchase_price'] ?? null,
                'notes' => $request->initial_batch_notes ?? null,
            ]);
        }

        return response()->json(
            $product->load('category', 'batches', 'conversions'),
            201
        );
    }

    public function show(Product $product)
    {
        return response()->json(
            $product->load('category', 'batches', 'conversions')
                ->setAttribute('average_cost', (float) $product->inventoryMovements()
                    ->whereIn('type', ['purchase', 'manual_in'])
                    ->whereNotNull('unit_cost')
                    ->where('unit_cost', '>', 0)
                    ->selectRaw('SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0) as avg')
                    ->value('avg') ?? $product->purchase_price ?? 0)
        );
    }

    public function update(Request $request, Product $product)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:100|unique:products,sku,' . $product->id,
            'barcode' => 'nullable|string|unique:products,barcode,' . $product->id,
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'inventory_type' => 'required|in:unit,weight,volume',
            'purchase_price' => 'nullable|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'current_stock' => 'nullable|numeric|min:0',
            'min_stock' => 'nullable|numeric|min:0',
            'track_stock' => 'boolean',
            'track_batches' => 'boolean',
            'track_conversions' => 'boolean',
            'batch_generation' => 'nullable|in:manual,auto',
            'expiration_alert_days' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ];

        $validated = $request->validate($rules);

        $product->update($validated);

        return response()->json(
            $product->fresh()->load('category', 'batches', 'conversions')
        );
    }

    public function destroy(Product $product)
    {
        $product->update(['is_active' => false]);
        return response()->json(['message' => 'Producto desactivado correctamente.']);
    }

    public function byBarcode($barcode)
    {
        $product = Product::with('category', 'conversions')
            ->select('products.*')
            ->selectRaw('COALESCE((
                SELECT SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0)
                FROM inventory_movements
                WHERE product_id = products.id
                AND type IN ("purchase", "manual_in")
                AND unit_cost IS NOT NULL AND unit_cost > 0
            ), products.purchase_price, 0) as average_cost')
            ->where('barcode', $barcode)
            ->where('is_active', true)
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Producto no encontrado.'], 404);
        }

        return response()->json($product);
    }

    public function batches(Product $product)
    {
        return response()->json(
            $product->batches()
                ->orderBy('expiration_date')
                ->orderBy('batch_code')
                ->get()
        );
    }

    public function conversions(Product $product)
    {
        return response()->json($product->conversions);
    }

    public function movements(Product $product, Request $request)
    {
        $query = $product->inventoryMovements()->with('user');

        if ($request->from) {
            $query->where('created_at', '>=', Carbon::parse($request->from)->startOfDay());
        }
        if ($request->to) {
            $query->where('created_at', '<=', Carbon::parse($request->to)->endOfDay());
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 20)
        );
    }

    public function adjustStock(Request $request, Product $product)
    {
        $isDecimal = $product->is_weight_or_volume;

        $rules = [
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string|max:500',
            'batch_id' => 'nullable|exists:product_batches,id',
        ];

        if ($request->reason === 'Conteo físico') {
            if ($product->track_batches) {
                $rules['batches'] = 'required|array';
                $rules['batches.*.id'] = 'required|exists:product_batches,id';
                $rules['batches.*.physical_stock'] = 'required|numeric|min:0';
            } else {
                $rules['physical_stock'] = 'required|numeric|min:0';
            }
        } else {
            $rules['type'] = 'required|in:in,out';
            $rules['quantity'] = $isDecimal
                ? 'required|numeric|min:0.001'
                : 'required|numeric|min:1';
        }

        $validated = $request->validate($rules);

        $notes = $validated['reason'];
        if (!empty($validated['notes'])) {
            $notes .= ': ' . $validated['notes'];
        }

        if ($request->reason === 'Conteo físico' && $product->track_batches) {
            $totalDiff = 0;
            $batchIds = $product->batches()->pluck('id')->toArray();
            $oldStock = (float) $product->current_stock;

            foreach ($validated['batches'] as $batchData) {
                $batch = \App\Models\ProductBatch::findOrFail($batchData['id']);
                $batchOldStock = (float) $batch->current_quantity;
                $batchNewStock = (float) $batchData['physical_stock'];
                $batchDiff = $batchNewStock - $batchOldStock;

                $batch->update(['current_quantity' => $batchNewStock]);
                $totalDiff += $batchDiff;

                $product->inventoryMovements()->create([
                    'type' => 'adjustment',
                    'quantity' => $batchDiff,
                    'stock_before' => $batchOldStock,
                    'stock_after' => $batchNewStock,
                    'user_id' => auth()->id(),
                    'batch_id' => $batch->id,
                    'notes' => $notes . ' (Lote: ' . $batch->batch_code . ')',
                ]);
            }

            $newStock = max(0, (float) $product->batches()->sum('current_quantity'));
            $product->update(['current_stock' => $newStock]);

            return response()->json([
                'message' => 'Stock ajustado correctamente.',
                'product' => $product->fresh()->load('category', 'batches', 'conversions'),
            ]);
        }

        $oldStock = (float) $product->current_stock;

        if ($request->reason === 'Conteo físico') {
            $physicalStock = (float) $validated['physical_stock'];
            $quantity = $physicalStock - $oldStock;
            $newStock = $physicalStock;
        } else {
            $quantity = (float) $validated['quantity'];
            if ($validated['type'] === 'out') {
                $quantity = -$quantity;
            }
            $newStock = $oldStock + $quantity;
        }

        if ($newStock < 0) {
            return response()->json([
                'message' => 'El stock resultante no puede ser negativo. Stock actual: ' . $oldStock,
            ], 422);
        }

        $batchId = null;
        if ($product->track_batches) {
            if (empty($validated['batch_id'])) {
                return response()->json([
                    'message' => 'Este producto requiere seleccionar un lote.',
                ], 422);
            }
            $batch = \App\Models\ProductBatch::findOrFail($validated['batch_id']);
            $batch->increment('current_quantity', $quantity);
            $batchId = $batch->id;
        }

        $product->update(['current_stock' => $newStock]);

        $product->inventoryMovements()->create([
            'type' => 'adjustment',
            'quantity' => $quantity,
            'stock_before' => $oldStock,
            'stock_after' => $newStock,
            'user_id' => auth()->id(),
            'batch_id' => $batchId,
            'notes' => $notes,
        ]);

        return response()->json([
            'message' => 'Stock ajustado correctamente.',
            'product' => $product->fresh()->load('category', 'batches', 'conversions'),
        ]);
    }

    public function restock(Request $request, Product $product)
    {
        $isDecimal = $product->is_weight_or_volume;

        $rules = [
            'quantity' => $isDecimal ? 'required|numeric|min:0.001' : 'required|integer|min:1',
            'type' => 'required|in:purchase,manual_in',
            'unit_cost' => 'nullable|numeric|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'reference' => 'nullable|string|max:100',
            'conversion_id' => 'nullable|exists:product_conversions,id',
            'batch_option' => $product->track_batches ? 'required|in:none,existing,new' : 'nullable|in:none',
            'batch_id' => 'required_if:batch_option,existing|exists:product_batches,id',
            'batch_code' => 'required_if:batch_option,new|string|max:50',
            'batch_expiration' => 'required_if:batch_option,new|date',
        ];

        $validated = $request->validate($rules);

        $quantity = (float) $validated['quantity'];

        if (!empty($validated['conversion_id'])) {
            $conversion = \App\Models\ProductConversion::findOrFail($validated['conversion_id']);
            $quantity = $quantity * (float) $conversion->factor;
        }

        $unitCost = null;
        if (!empty($validated['purchase_price']) && $quantity > 0) {
            $unitCost = $validated['purchase_price'] / $quantity;
        } elseif (!empty($validated['unit_cost'])) {
            $unitCost = $validated['unit_cost'];
        }

        $oldStock = (float) $product->current_stock;
        $newStock = $oldStock + $quantity;

        $batchId = null;

        if (($validated['batch_option'] ?? 'none') === 'existing' && !empty($validated['batch_id'])) {
            $batch = \App\Models\ProductBatch::findOrFail($validated['batch_id']);
            $batch->increment('current_quantity', $quantity);
            $batchId = $batch->id;
        }

        if (($validated['batch_option'] ?? 'none') === 'new') {
            $batch = $product->batches()->create([
                'batch_code' => $validated['batch_code'],
                'expiration_date' => $validated['batch_expiration'],
                'current_quantity' => $quantity,
                'unit_cost' => $unitCost ?? 0,
                'notes' => $validated['notes'] ?? null,
            ]);
            $batchId = $batch->id;
        }

        $product->update(['current_stock' => $newStock]);

        $movementData = [
            'type' => $validated['type'],
            'quantity' => $quantity,
            'stock_before' => $oldStock,
            'stock_after' => $newStock,
            'unit_cost' => $unitCost,
            'purchase_price' => $validated['purchase_price'] ?? null,
            'user_id' => auth()->id(),
            'notes' => $validated['notes'] ?? null,
            'batch_id' => $batchId,
            'conversion_id' => $validated['conversion_id'] ?? null,
        ];

        if (!empty($validated['reference'])) {
            $movementData['reference_type'] = $validated['type'] === 'purchase' ? 'purchase_order' : 'manual';
            $movementData['reference_id'] = $validated['reference'];
        }

        $product->inventoryMovements()->create($movementData);

        return response()->json([
            'message' => 'Producto reabastecido correctamente.',
            'product' => $product->fresh()->load('category', 'batches', 'conversions'),
        ]);
    }
}
