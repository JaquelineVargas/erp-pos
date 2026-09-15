<?php

namespace App\Http\Controllers\Api;

use App\Enums\ArqueoMovementType;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\InventoryMovement;
use App\Services\ArqueoService;
use App\Services\TicketService;
use App\Services\DateUtils;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function __construct(
        protected ArqueoService $arqueoService,
        protected TicketService $ticketService,
    ) {}

    public function index(Request $request)
    {
        $query = Sale::with('user', 'customer', 'items.product');

        if ($request->from) $query->where('created_at', '>=', Carbon::parse($request->from)->startOfDay());
        if ($request->to) $query->where('created_at', '<=', Carbon::parse($request->to)->endOfDay());
        if ($request->payment_method) $query->where('payment_method', $request->payment_method);
        if ($request->user_role) $query->whereHas('user', fn($q) => $q->where('role', $request->user_role));
        if ($request->user_id) $query->where('user_id', $request->user_id);
        if ($request->customer_id) $query->where('customer_id', $request->customer_id);
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('folio', 'like', "%{$request->search}%")
                  ->orWhereHas('customer', function ($cq) use ($request) {
                      $cq->where('name', 'like', "%{$request->search}%");
                  })
                  ->orWhereHas('items.product', function ($pq) use ($request) {
                      $pq->where('name', 'like', "%{$request->search}%");
                  });
            });
        }

        $sales = $query->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($sales);
    }

    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'payment_method' => 'required|string',
            'customer_id' => 'nullable|exists:customers,id',
            'notes' => 'nullable|string',
            'received_amount' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|in:fixed,percentage',
            'discount_value' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request) {
            $user = $request->user();
            $subtotal = 0;
            $items = [];

            $arqueo = $this->arqueoService->getActiveArqueo($user->id);

            foreach ($request->items as $item) {
                $product = Product::with('conversions')->findOrFail($item['product_id']);
                $qty = (float) $item['quantity'];

                if (!$product->is_weight_or_volume && $qty != floor($qty)) {
                    return response()->json([
                        'message' => "{$product->name}: no se permiten cantidades decimales para productos tipo Unidad.",
                    ], 422);
                }

                $effectiveQty = $qty;
                $conversionId = null;

                if (!empty($item['conversion_id'])) {
                    $conversion = $product->conversions->find($item['conversion_id']);
                    if ($conversion) {
                        $effectiveQty = $qty * $conversion->factor;
                        $conversionId = $conversion->id;
                    }
                }

                if ($product->track_stock && $product->current_stock < $effectiveQty) {
                    return response()->json([
                        'message' => "Stock insuficiente para {$product->name}. Disponible: {$product->current_stock}",
                    ], 409);
                }

                $itemSubtotal = $product->selling_price * $effectiveQty;
                $subtotal += $itemSubtotal;

                $items[] = [
                    'product_id' => $product->id,
                    'quantity' => $effectiveQty,
                    'price' => $product->selling_price,
                    'subtotal' => $itemSubtotal,
                    'cost' => $product->purchase_price,
                    'conversion_id' => $conversionId,
                ];
            }

            // Apply discount
            $discountType = $request->discount_type;
            $discountValue = $request->discount_value ?? 0;
            $discountAmount = 0;

            if ($discountType === 'fixed') {
                $discountAmount = min($discountValue, $subtotal);
            } elseif ($discountType === 'percentage') {
                $discountAmount = $subtotal * ($discountValue / 100);
            }

            $total = $subtotal - $discountAmount;

            $receivedAmount = $request->received_amount;
            $change = null;
            if ($receivedAmount && $receivedAmount >= $total) {
                $change = $receivedAmount - $total;
            }

            $folio = 'VEN-' . DateUtils::nowUTC()->format('Ymd') . '-' . str_pad((Sale::max('id') ?? 0) + 1, 4, '0', STR_PAD_LEFT);

            $sale = Sale::create([
                'folio' => $folio,
                'user_id' => $user->id,
                'customer_id' => $request->customer_id,
                'arqueo_id' => $arqueo?->id,
                'subtotal' => $subtotal,
                'tax' => 0,
                'discount_type' => $discountType,
                'discount_value' => $discountValue,
                'discount_amount' => $discountAmount,
                'total' => $total,
                'received_amount' => $receivedAmount,
                'change' => $change,
                'payment_method' => $request->payment_method,
                'status' => 'completed',
                'notes' => $request->notes,
            ]);

            foreach ($items as $item) {
                $sale->items()->create($item);
            }

            // Register inventory movements and decrement stock
            foreach ($items as $item) {
                $product = Product::find($item['product_id']);
                if ($product && $product->track_stock) {
                    $stockBefore = (float) $product->current_stock;

                    if ($product->track_batches) {
                        $remaining = (float) $item['quantity'];
                        $totalTaken = 0;

                        $batches = $product->batches()
                            ->where('current_quantity', '>', 0)
                            ->orderBy('expiration_date')
                            ->orderBy('batch_code')
                            ->get();

                        foreach ($batches as $batch) {
                            if ($remaining <= 0) break;
                            $taken = min($remaining, (float) $batch->current_quantity);
                            $batch->decrement('current_quantity', $taken);
                            $remaining -= $taken;
                            $totalTaken += $taken;

                            InventoryMovement::create([
                                'product_id' => $product->id,
                                'batch_id' => $batch->id,
                                'type' => 'sale',
                                'quantity' => -$taken,
                                'stock_before' => $stockBefore,
                                'stock_after' => $stockBefore - $totalTaken,
                                'unit_cost' => $batch->unit_cost ?? $item['cost'],
                                'reference_type' => 'sale',
                                'reference_id' => $sale->id,
                                'user_id' => $user->id,
                                'notes' => "Venta {$sale->folio}",
                                'conversion_id' => $item['conversion_id'] ?? null,
                            ]);
                        }

                        $product->decrement('current_stock', $totalTaken);
                    } else {
                        $product->decrement('current_stock', $item['quantity']);

                        InventoryMovement::create([
                            'product_id' => $product->id,
                            'type' => 'sale',
                            'quantity' => -$item['quantity'],
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockBefore - $item['quantity'],
                            'unit_cost' => $item['cost'],
                            'reference_type' => 'sale',
                            'reference_id' => $sale->id,
                            'user_id' => $user->id,
                            'notes' => "Venta {$sale->folio}",
                            'conversion_id' => $item['conversion_id'] ?? null,
                        ]);
                    }
                }
            }

            // Register arqueo movement for this sale
            if ($arqueo) {
                $movementType = match ($request->payment_method) {
                    'cash' => ArqueoMovementType::CASH_SALE,
                    'card' => ArqueoMovementType::CARD_SALE,
                    'transfer' => ArqueoMovementType::TRANSFER_SALE,
                    'qr' => ArqueoMovementType::QR_SALE,
                    default => null,
                };
                if ($movementType) {
                    $this->arqueoService->addMovement(
                        $arqueo->id,
                        $movementType,
                        $total,
                        "Venta {$sale->folio}",
                        $sale->id,
                    );
                }
            }

            return response()->json($sale->load('items.product', 'user', 'customer'), 201);
        });
    }

    public function show(Sale $sale)
    {
        return response()->json($sale->load('items.product', 'user', 'customer'));
    }

    public function ticket(Sale $sale)
    {
        $format = request('format', 'html');

        try {
            return match($format) {
                'escpos' => response($this->ticketService->generateEscPos($sale))
                    ->header('Content-Type', 'text/plain'),
                'pdf' => $this->ticketService->generatePdf($sale, (int) request('width', 80))->download("ticket-{$sale->folio}.pdf"),
                default => response()->json([
                    'html' => $this->ticketService->generateHtml($sale),
                    'folio' => $sale->folio,
                ]),
            };
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => null,
            ], 500);
        }
    }

}
