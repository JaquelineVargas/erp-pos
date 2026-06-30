<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\CashMovement;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashRegisterController extends Controller
{
    public function current(Request $request)
    {
        $register = CashRegister::with('movements')
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        return response()->json($register);
    }

    public function open(Request $request)
    {
        $request->validate([
            'initial_amount' => 'required|numeric|min:0',
        ]);

        $existing = CashRegister::where('user_id', $request->user()->id)
            ->where('status', 'open')->first();

        if ($existing) {
            return response()->json(['message' => 'Ya tienes una caja abierta.'], 409);
        }

        $register = CashRegister::create([
            'user_id' => $request->user()->id,
            'initial_amount' => $request->initial_amount,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        return response()->json($register, 201);
    }

    public function close(Request $request)
    {
        $request->validate([
            'final_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $register = CashRegister::with('movements')
            ->where('user_id', $request->user()->id)
            ->where('status', 'open')->first();

        if (!$register) {
            return response()->json(['message' => 'No tienes una caja abierta.'], 404);
        }

        // Calculate summary
        $sales = Sale::where('cash_register_id', $register->id)->get();
        $totalSales = $sales->sum('total');
        $salesCount = $sales->count();

        $movements = $register->movements;
        $totalIncome = $movements->where('type', 'income')->sum('amount');
        $totalExpense = $movements->where('type', 'expense')->sum('amount');

        $expectedAmount = $register->initial_amount + $totalSales + $totalIncome - $totalExpense;
        $difference = $request->final_amount - $expectedAmount;

        // Payment methods breakdown
        $paymentBreakdown = $sales->groupBy('payment_method')->map(function ($methodSales) {
            return [
                'count' => $methodSales->count(),
                'total' => round($methodSales->sum('total'), 2),
            ];
        });

        $register->update([
            'final_amount' => $request->final_amount,
            'expected_amount' => round($expectedAmount, 2),
            'difference' => round($difference, 2),
            'total_sales' => $totalSales,
            'sales_count' => $salesCount,
            'payment_methods_breakdown' => $paymentBreakdown->toArray(),
            'status' => 'closed',
            'closed_at' => now(),
            'notes' => $request->notes,
        ]);

        return response()->json($register->load('movements'));
    }

    public function movement(Request $request)
    {
        $request->validate([
            'type' => 'required|in:income,expense',
            'description' => 'required|string',
            'amount' => 'required|numeric|min:0',
        ]);

        $register = CashRegister::where('user_id', $request->user()->id)
            ->where('status', 'open')->first();

        if (!$register) {
            return response()->json(['message' => 'No tienes una caja abierta.'], 404);
        }

        $movement = $register->movements()->create([
            'type' => $request->type,
            'description' => $request->description,
            'amount' => $request->amount,
        ]);

        return response()->json($movement, 201);
    }

    public function history(Request $request)
    {
        $registers = CashRegister::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        return response()->json($registers);
    }
}
