<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Product;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\ProductBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function sales(Request $request)
    {
        $query = Sale::with('user', 'customer', 'items.product')
            ->select('sales.*');

        if ($request->from) $query->whereDate('sales.created_at', '>=', $request->from);
        if ($request->to) $query->whereDate('sales.created_at', '<=', $request->to);
        if ($request->user_id) $query->where('sales.user_id', $request->user_id);
        if ($request->payment_method) $query->where('sales.payment_method', $request->payment_method);
        if ($request->customer_id) $query->where('sales.customer_id', $request->customer_id);

        $sales = $query->orderBy('sales.created_at', 'desc')->get();

        $summary = [
            'total_sales' => $sales->count(),
            'total_revenue' => round($sales->sum('total'), 2),
            'total_tax' => round($sales->sum('tax'), 2),
            'total_discounts' => round($sales->sum('discount_amount'), 2),
            'average_sale' => $sales->count() > 0 ? round($sales->avg('total'), 2) : 0,
        ];

        $byPaymentMethod = $sales->groupBy('payment_method')->map(function ($items, $key) {
            return [
                'method' => $key,
                'count' => $items->count(),
                'total' => round($items->sum('total'), 2),
            ];
        })->values();

        return response()->json([
            'sales' => $sales,
            'summary' => $summary,
            'by_payment_method' => $byPaymentMethod,
        ]);
    }

    public function products(Request $request)
    {
        $query = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->select(
                'products.id',
                'products.name',
                'products.barcode',
                'products.current_stock as stock',
                'products.selling_price as price',
                DB::raw('SUM(sale_items.quantity) as total_sold'),
                DB::raw('SUM(sale_items.subtotal) as total_revenue'),
            )
            ->groupBy('products.id', 'products.name', 'products.barcode', 'products.current_stock', 'products.selling_price');

        if ($request->from) $query->where('sales.created_at', '>=', $request->from);
        if ($request->to) $query->where('sales.created_at', '<=', $request->to);
        if ($request->search) $query->where('products.name', 'like', "%{$request->search}%");

        $products = $query->orderBy('total_sold', 'desc')->get();

        return response()->json($products);
    }

    public function customers(Request $request)
    {
        $query = Customer::withCount('sales')
            ->withSum('sales', 'total');

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->from) {
            $query->whereHas('sales', function ($q) use ($request) {
                $q->whereDate('created_at', '>=', $request->from);
            });
        }

        if ($request->to) {
            $query->whereHas('sales', function ($q) use ($request) {
                $q->whereDate('created_at', '<=', $request->to);
            });
        }

        $customers = $query->orderBy('sales_sum_total', 'desc')->paginate(20);

        return response()->json($customers);
    }

    public function purchases(Request $request)
    {
        $query = InventoryMovement::with('product', 'user', 'batch', 'conversion')
            ->where('type', 'purchase');

        if ($request->from) $query->whereDate('created_at', '>=', $request->from);
        if ($request->to) $query->whereDate('created_at', '<=', $request->to);
        if ($request->search) $query->whereHas('product', fn($q) => $q->where('name', 'like', "%{$request->search}%"));
        if ($request->user_id) $query->where('user_id', $request->user_id);

        $all = $query->orderBy('created_at', 'desc')->get();

        $summary = [
            'total_purchases' => $all->count(),
            'total_quantity' => round((float) $all->sum('quantity'), 3),
            'total_cost' => round($all->sum(fn($m) => (float) $m->quantity * (float) ($m->unit_cost ?? 0)), 2),
        ];

        return response()->json([
            'data' => $all,
            'summary' => $summary,
        ]);
    }

    public function expiringBatches(Request $request)
    {
        $today = now()->startOfDay();
        $alertDays = (int) ($request->alert_days ?? 0);

        $query = ProductBatch::with('product.category')
            ->where('current_quantity', '>', 0)
            ->whereNotNull('expiration_date');

        if ($request->search) {
            $query->whereHas('product', fn($q) => $q->where('name', 'like', "%{$request->search}%"));
        }

        $batches = $query->get();

        $expired = [];
        $expiringSoon = [];

        foreach ($batches as $batch) {
            $expDate = $batch->expiration_date->startOfDay();
            $daysLeft = (int) $today->diffInDays($expDate, false);
            $threshold = $alertDays ?: ((int) ($batch->product?->expiration_alert_days ?? 30));

            if ($daysLeft < 0) {
                $expired[] = [
                    'id' => $batch->id,
                    'product_id' => $batch->product_id,
                    'product_name' => $batch->product?->name,
                    'product_barcode' => $batch->product?->barcode,
                    'category' => $batch->product?->category?->name,
                    'batch_code' => $batch->batch_code,
                    'expiration_date' => $batch->expiration_date->format('Y-m-d'),
                    'current_quantity' => (float) $batch->current_quantity,
                    'unit_cost' => (float) ($batch->unit_cost ?? 0),
                    'days_left' => $daysLeft,
                    'status' => 'expired',
                ];
            } elseif ($daysLeft <= $threshold) {
                $expiringSoon[] = [
                    'id' => $batch->id,
                    'product_id' => $batch->product_id,
                    'product_name' => $batch->product?->name,
                    'product_barcode' => $batch->product?->barcode,
                    'category' => $batch->product?->category?->name,
                    'batch_code' => $batch->batch_code,
                    'expiration_date' => $batch->expiration_date->format('Y-m-d'),
                    'current_quantity' => (float) $batch->current_quantity,
                    'unit_cost' => (float) ($batch->unit_cost ?? 0),
                    'days_left' => $daysLeft,
                    'status' => 'expiring_soon',
                ];
            }
        }

        $allItems = array_merge($expired, $expiringSoon);
        $affectedProductIds = collect($allItems)->pluck('product_id')->unique();

        $summary = [
            'total_expired' => count($expired),
            'total_expiring_soon' => count($expiringSoon),
            'total_batches' => count($allItems),
            'affected_products' => $affectedProductIds->count(),
            'total_quantity_at_risk' => round(collect($allItems)->sum('current_quantity'), 3),
        ];

        return response()->json([
            'expired' => $expired,
            'expiring_soon' => $expiringSoon,
            'summary' => $summary,
        ]);
    }
}
