<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Arqueo;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Services\DateUtils;
use Carbon\Carbon;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Font;

class ExportController extends Controller
{
    public function salesExcel(Request $request)
    {
        $query = Sale::with('user', 'customer');

        if ($request->from) $query->where('created_at', '>=', Carbon::parse($request->from)->startOfDay());
        if ($request->to) $query->where('created_at', '<=', Carbon::parse($request->to)->endOfDay());
        if ($request->payment_method) $query->where('payment_method', $request->payment_method);
        if ($request->user_id) $query->where('user_id', $request->user_id);

        $sales = $query->orderBy('created_at', 'desc')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Ventas');

        $headers = ['Folio', 'Fecha', 'Cliente', 'Vendedor', 'Método Pago', 'Subtotal', 'Descuento', 'Total', 'Recibido', 'Cambio'];
        $sheet->fromArray($headers, null, 'A1');

        $row = 2;
        foreach ($sales as $s) {
            $sheet->setCellValue("A{$row}", $s->folio);
            $sheet->setCellValue("B{$row}", DateUtils::formatLocale($s->created_at));
            $sheet->setCellValue("C{$row}", $s->customer->name ?? 'Mostrador');
            $sheet->setCellValue("D{$row}", $s->user->name);
            $sheet->setCellValue("E{$row}", $s->payment_method);
            $sheet->setCellValue("F{$row}", (float) $s->subtotal);
            $sheet->setCellValue("G{$row}", (float) ($s->discount_amount ?? 0));
            $sheet->setCellValue("H{$row}", (float) $s->total);
            $sheet->setCellValue("I{$row}", (float) ($s->received_amount ?? 0));
            $sheet->setCellValue("J{$row}", (float) ($s->change ?? 0));
            $row++;
        }

        // Style header
        $sheet->getStyle('A1:J1')->getFont()->setBold(true);
        foreach (range('A', 'J') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $this->downloadXlsx($spreadsheet, 'ventas_' . DateUtils::nowUTC()->format('Y-m-d') . '.xlsx');
    }

    public function productsExcel(Request $request)
    {
        $query = Product::with('category')->where('is_active', true);

        if ($request->category_id) $query->where('category_id', $request->category_id);
        if ($request->low_stock) $query->whereColumn('current_stock', '<=', 'min_stock');

        $products = $query->orderBy('name')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Productos');

        $headers = ['Nombre', 'Código', 'Categoría', 'Precio', 'Costo', 'Stock', 'Stock Mínimo'];
        $sheet->fromArray($headers, null, 'A1');

        $row = 2;
        foreach ($products as $p) {
            $sheet->setCellValue("A{$row}", $p->name);
            $sheet->setCellValue("B{$row}", $p->barcode ?? '');
            $sheet->setCellValue("C{$row}", $p->category->name ?? '');
            $sheet->setCellValue("D{$row}", (float) $p->selling_price);
            $sheet->setCellValue("E{$row}", (float) ($p->purchase_price ?? 0));
            $sheet->setCellValue("F{$row}", (int) $p->current_stock);
            $sheet->setCellValue("G{$row}", (int) $p->min_stock);
            $row++;
        }

        $sheet->getStyle('A1:G1')->getFont()->setBold(true);
        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $this->downloadXlsx($spreadsheet, 'productos_' . DateUtils::nowUTC()->format('Y-m-d') . '.xlsx');
    }

    public function arqueoExcel(Request $request)
    {
        $arqueos = Arqueo::with('user')->orderBy('created_at', 'desc');

        if ($request->from) $arqueos->where('created_at', '>=', Carbon::parse($request->from)->startOfDay());
        if ($request->to) $arqueos->where('created_at', '<=', Carbon::parse($request->to)->endOfDay());

        $data = $arqueos->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Arqueos');

        $headers = ['Usuario', 'Apertura', 'Cierre', 'Inicial', 'Ventas Efectivo', 'Ventas Tarjeta', 'Ventas Transfer', 'Ventas QR',
            'Ingresos', 'Gastos', 'Devoluciones', 'Anulaciones', 'Esperado', 'Final', 'Diferencia', 'Ventas Count', 'Estado'];
        $sheet->fromArray($headers, null, 'A1');

        $row = 2;
        foreach ($data as $r) {
            $sheet->setCellValue("A{$row}", $r->user->name ?? '');
            $sheet->setCellValue("B{$row}", $r->opened_at ? DateUtils::formatLocale($r->opened_at) : '');
            $sheet->setCellValue("C{$row}", $r->closed_at ? DateUtils::formatLocale($r->closed_at) : '');
            $sheet->setCellValue("D{$row}", (float) $r->initial_amount);
            $sheet->setCellValue("E{$row}", (float) $r->cash_sales);
            $sheet->setCellValue("F{$row}", (float) $r->card_sales);
            $sheet->setCellValue("G{$row}", (float) $r->transfer_sales);
            $sheet->setCellValue("H{$row}", (float) $r->qr_sales);
            $sheet->setCellValue("I{$row}", (float) $r->manual_income);
            $sheet->setCellValue("J{$row}", (float) $r->expenses);
            $sheet->setCellValue("K{$row}", (float) $r->return_total);
            $sheet->setCellValue("L{$row}", (float) $r->void_total);
            $sheet->setCellValue("M{$row}", (float) ($r->expected_cash ?? 0));
            $sheet->setCellValue("N{$row}", (float) ($r->final_amount ?? 0));
            $sheet->setCellValue("O{$row}", (float) ($r->cash_difference ?? 0));
            $sheet->setCellValue("P{$row}", (int) ($r->total_sales_count ?? 0));
            $sheet->setCellValue("Q{$row}", $r->state);
            $row++;
        }

        $sheet->getStyle('A1:Q1')->getFont()->setBold(true);
        foreach (range('A', 'Q') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $this->downloadXlsx($spreadsheet, 'arqueos_' . DateUtils::nowUTC()->format('Y-m-d') . '.xlsx');
    }

    public function inventoryExcel(Request $request)
    {
        $products = Product::with('category')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Inventario');

        $headers = ['Nombre', 'Código', 'Categoría', 'Precio', 'Costo', 'Stock', 'Stock Mínimo', 'Diferencia', 'Valor Inventario'];
        $sheet->fromArray($headers, null, 'A1');

        $row = 2;
        foreach ($products as $p) {
            $diff = $p->current_stock - $p->min_stock;
            $value = $p->current_stock * ($p->purchase_price ?? 0);
            $sheet->setCellValue("A{$row}", $p->name);
            $sheet->setCellValue("B{$row}", $p->barcode ?? '');
            $sheet->setCellValue("C{$row}", $p->category->name ?? '');
            $sheet->setCellValue("D{$row}", (float) $p->selling_price);
            $sheet->setCellValue("E{$row}", (float) ($p->purchase_price ?? 0));
            $sheet->setCellValue("F{$row}", (int) $p->current_stock);
            $sheet->setCellValue("G{$row}", (int) $p->min_stock);
            $sheet->setCellValue("H{$row}", $diff);
            $sheet->setCellValue("I{$row}", round($value, 2));
            $row++;
        }

        $sheet->getStyle('A1:I1')->getFont()->setBold(true);
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $this->downloadXlsx($spreadsheet, 'inventario_' . DateUtils::nowUTC()->format('Y-m-d') . '.xlsx');
    }

    public function purchasesExcel(Request $request)
    {
        $query = InventoryMovement::with('product', 'user', 'batch', 'conversion')
            ->where('type', 'purchase');

        if ($request->from) $query->where('created_at', '>=', Carbon::parse($request->from)->startOfDay());
        if ($request->to) $query->where('created_at', '<=', Carbon::parse($request->to)->endOfDay());

        $movements = $query->orderBy('created_at', 'desc')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Compras');

        $headers = ['Fecha', 'Producto', 'Código', 'Lote', 'Tipo', 'Cantidad', 'Costo Ud.', 'Costo Total', 'Factura/OC', 'Usuario'];
        $sheet->fromArray($headers, null, 'A1');

        $row = 2;
        foreach ($movements as $m) {
            $typeLabel = 'Compra';
            $totalCost = $m->purchase_price ?? ((float) $m->quantity * (float) ($m->unit_cost ?? 0));
            $sheet->setCellValue("A{$row}", DateUtils::formatLocale($m->created_at));
            $sheet->setCellValue("B{$row}", $m->product?->name ?? '');
            $sheet->setCellValue("C{$row}", $m->product?->barcode ?? '');
            $sheet->setCellValue("D{$row}", $m->batch?->batch_code ?? '—');
            $sheet->setCellValue("E{$row}", $typeLabel);
            $sheet->setCellValue("F{$row}", (float) $m->quantity);
            $sheet->setCellValue("G{$row}", (float) ($m->unit_cost ?? 0));
            $sheet->setCellValue("H{$row}", round($totalCost, 2));
            $sheet->setCellValue("I{$row}", $m->reference_id ?? '—');
            $sheet->setCellValue("J{$row}", $m->user?->name ?? '—');
            $row++;
        }

        $sheet->getStyle('A1:J1')->getFont()->setBold(true);
        foreach (range('A', 'J') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $this->downloadXlsx($spreadsheet, 'compras_' . DateUtils::nowUTC()->format('Y-m-d') . '.xlsx');
    }

    public function expiringBatchesExcel(Request $request)
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

        $rows = [];
        foreach ($batches as $batch) {
            $expDate = $batch->expiration_date->startOfDay();
            $daysLeft = (int) $today->diffInDays($expDate, false);
            $threshold = $alertDays ?: ((int) ($batch->product?->expiration_alert_days ?? 30));

            if ($daysLeft < 0) {
                $status = 'Vencido';
            } elseif ($daysLeft <= $threshold) {
                $status = 'Por vencer';
            } else {
                continue;
            }

            $rows[] = [
                $batch->product?->name ?? '',
                $batch->product?->barcode ?? '',
                $batch->product?->category?->name ?? '',
                $batch->batch_code,
                $batch->expiration_date->format('Y-m-d'),
                (float) $batch->current_quantity,
                $status,
                $daysLeft,
                (float) ($batch->unit_cost ?? 0),
            ];
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Lotes por Vencer');

        $headers = ['Producto', 'Código', 'Categoría', 'Lote', 'Vencimiento', 'Stock', 'Estado', 'Días', 'Costo Ud.'];
        $sheet->fromArray($headers, null, 'A1');

        $row = 2;
        foreach ($rows as $r) {
            $sheet->setCellValue("A{$row}", $r[0]);
            $sheet->setCellValue("B{$row}", $r[1]);
            $sheet->setCellValue("C{$row}", $r[2]);
            $sheet->setCellValue("D{$row}", $r[3]);
            $sheet->setCellValue("E{$row}", $r[4]);
            $sheet->setCellValue("F{$row}", $r[5]);
            $sheet->setCellValue("G{$row}", $r[6]);
            $sheet->setCellValue("H{$row}", $r[7]);
            $sheet->setCellValue("I{$row}", $r[8]);
            $row++;
        }

        $sheet->getStyle('A1:I1')->getFont()->setBold(true);
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $this->downloadXlsx($spreadsheet, 'lotes_por_vencer_' . DateUtils::nowUTC()->format('Y-m-d') . '.xlsx');
    }

    private function downloadXlsx(Spreadsheet $spreadsheet, string $filename)
    {
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
