<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Customer;
use App\Models\User;
use App\Services\DateUtils;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $today = DateUtils::nowUTC()->startOfDay();

        $todaySales = Sale::where('created_at', '>=', $today)->sum('total');
        $salesCount = Sale::where('created_at', '>=', $today)->count();
        $totalProducts = Product::where('is_active', true)->count();
        $totalCustomers = Customer::count();

        $now = DateUtils::nowUTC();

        $lowStockProducts = Product::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'min_stock')->count();

        $expiringSoon = ProductBatch::whereNotNull('expiration_date')
            ->where('expiration_date', '>=', $now)
            ->where('expiration_date', '<=', (clone $now)->addDays(30))
            ->distinct('product_id')
            ->count('product_id');

        $expired = ProductBatch::whereNotNull('expiration_date')
            ->where('expiration_date', '<', $now)
            ->distinct('product_id')
            ->count('product_id');

        $salesLast7Days = Sale::select(
            DB::raw("DATE(created_at) as date"),
            DB::raw('SUM(total) as total'),
            DB::raw('COUNT(*) as count')
        )
            ->where('created_at', '>=', DateUtils::nowUTC()->subDays(7))
            ->groupBy(DB::raw("DATE(created_at)"))
            ->orderBy('date')
            ->get();

        $topProducts = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->select('products.name', DB::raw('SUM(sale_items.quantity) as total_qty'),
                DB::raw('SUM(sale_items.subtotal) as total_sales'))
            ->groupBy('products.name')
            ->orderBy('total_qty', 'desc')
            ->limit(5)
            ->get();

        $recentSales = Sale::with('user', 'customer')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $salesByPaymentMethod = Sale::select('payment_method',
            DB::raw('SUM(total) as total'),
            DB::raw('COUNT(*) as count'))
            ->where('created_at', '>=', $today)
            ->groupBy('payment_method')
            ->get();

        $driver = DB::connection()->getDriverName();
        $dateFormat = $driver === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $monthlySales = Sale::select(
            DB::raw("$dateFormat as month"),
            DB::raw('SUM(total) as total'),
            DB::raw('COUNT(*) as count')
        )
            ->where('created_at', '>=', DateUtils::nowUTC()->subMonths(6))
            ->groupBy(DB::raw($dateFormat))
            ->orderBy('month')
            ->get();

        return response()->json([
            'today_sales' => round($todaySales, 2),
            'sales_count' => $salesCount,
            'total_products' => $totalProducts,
            'total_customers' => $totalCustomers,
            'low_stock_products' => $lowStockProducts,
            'expiring_soon_products' => $expiringSoon,
            'expired_products' => $expired,
            'sales_last_7_days' => $salesLast7Days,
            'top_products' => $topProducts,
            'recent_sales' => $recentSales,
            'sales_by_payment_method' => $salesByPaymentMethod,
            'monthly_sales' => $monthlySales,
        ]);
    }
}
