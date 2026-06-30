<?php

namespace App\Http\Controllers\Api;

use App\DTOs\ArqueoDTO;
use App\Enums\ArqueoMovementType;
use App\Enums\ArqueoStatus;
use App\Http\Controllers\Controller;
use App\Models\Arqueo;
use App\Services\ArqueoService;
use Illuminate\Http\Request;

class ArqueoController extends Controller
{
    public function __construct(protected ArqueoService $arqueoService) {}

    public function current(Request $request)
    {
        $arqueo = $this->arqueoService->getActiveArqueo($request->user()->id);

        if (!$arqueo) {
            return response()->json(null);
        }

        $arqueo->load('movements');

        $arqueo->live_breakdown = [
            'cash_sales' => (float) $arqueo->movements->where('type', 'cash_sale')->sum('amount'),
            'card_sales' => (float) $arqueo->movements->where('type', 'card_sale')->sum('amount'),
            'transfer_sales' => (float) $arqueo->movements->where('type', 'transfer_sale')->sum('amount'),
            'qr_sales' => (float) $arqueo->movements->where('type', 'qr_sale')->sum('amount'),
            'manual_income' => (float) $arqueo->movements->where('type', 'manual_income')->sum('amount'),
            'expenses' => (float) $arqueo->movements->where('type', 'expense')->sum('amount'),
            'returns' => (float) $arqueo->movements->where('type', 'return')->sum('amount'),
            'total_sales_count' => $arqueo->movements->whereIn('type', ['cash_sale', 'card_sale', 'transfer_sale', 'qr_sale'])->count(),
        ];

        return response()->json($arqueo);
    }

    public function open(Request $request)
    {
        $request->validate([
            'initial_amount' => 'required|numeric|min:0',
        ]);

        $dto = ArqueoDTO::fromRequest([
            'initial_amount' => $request->initial_amount,
        ]);

        $arqueo = $this->arqueoService->open($dto, $request->user()->id);

        return response()->json($arqueo, 201);
    }

    public function close(Request $request)
    {
        $request->validate([
            'final_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'coin_breakdown' => 'nullable|array',
        ]);

        $arqueo = $this->arqueoService->getActiveArqueo($request->user()->id);

        if (!$arqueo) {
            return response()->json(['message' => 'No tienes un arqueo abierto.'], 404);
        }

        $dto = ArqueoDTO::fromRequest([
            'final_amount' => $request->final_amount,
            'notes' => $request->notes,
            'coin_breakdown' => $request->coin_breakdown,
        ]);

        $closed = $this->arqueoService->close($arqueo->id, $dto, $request->user()->id);

        return response()->json($closed->load('movements'));
    }

    public function movement(Request $request)
    {
        $request->validate([
            'type' => 'required|string|in:cash_sale,card_sale,transfer_sale,qr_sale,manual_income,expense,withdrawal,return,void',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'sale_id' => 'nullable|exists:sales,id',
        ]);

        $arqueo = $this->arqueoService->getActiveArqueo($request->user()->id);

        if (!$arqueo) {
            return response()->json(['message' => 'No tienes un arqueo abierto.'], 404);
        }

        $movement = $this->arqueoService->addMovement(
            $arqueo->id,
            ArqueoMovementType::from($request->type),
            $request->amount,
            $request->description,
            $request->sale_id,
        );

        return response()->json($movement, 201);
    }

    public function summary(Request $request)
    {
        $arqueo = $this->arqueoService->getActiveArqueo($request->user()->id);

        if (!$arqueo) {
            return response()->json([
                'message' => 'No tienes un arqueo abierto.',
                'error_code' => 'NO_ACTIVE_ARQUEO',
            ], 404);
        }

        return response()
            ->json($this->arqueoService->summary($arqueo->id))
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    public function history(Request $request)
    {
        $arqueos = Arqueo::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($arqueos);
    }

    public function show(Arqueo $arqueo)
    {
        return response()->json($this->arqueoService->summary($arqueo->id));
    }
}
