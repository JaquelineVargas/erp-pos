<?php

namespace App\Services;

use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;

class TicketService
{
    public const TICKET_WIDTH_58 = 32;
    public const TICKET_WIDTH_80 = 48;

    public function generateHtml(Sale $sale, int $width = self::TICKET_WIDTH_58): string
    {
        $items = $sale->items()->with('product')->get();
        $lines = $this->buildTicketLines($sale, $items, $width);

        $html = '<div style="font-family:monospace;font-size:12px;max-width:' . ($width * 8) . 'px;margin:0 auto;">';
        foreach ($lines as $line) {
            $html .= '<div style="white-space:pre-wrap;">' . e($line) . '</div>';
        }
        $html .= '</div>';

        return $html;
    }

    public function generateEscPos(Sale $sale, int $width = self::TICKET_WIDTH_58): string
    {
        $items = $sale->items()->with('product')->get();
        $lines = $this->buildTicketLines($sale, $items, $width);

        $escpos = '';
        $escpos .= chr(27) . '@'; // Initialize printer
        $escpos .= chr(27) . 'a' . chr(0); // Left align
        $escpos .= chr(27) . '!' . chr(0x38); // Double width + double height for header

        foreach ($lines as $line) {
            if (str_starts_with($line, '=== CENTRO')) {
                $escpos .= chr(27) . 'a' . chr(1); // Center align
                $escpos .= chr(27) . '!' . chr(0x38);
                $escpos .= str_pad($line, $width) . "\n";
                $escpos .= chr(27) . 'a' . chr(0); // Left align
                $escpos .= chr(27) . '!' . chr(0);
            } elseif (str_starts_with($line, '---')) {
                $escpos .= str_repeat('-', $width) . "\n";
            } else {
                $escpos .= $line . "\n";
            }
        }

        $escpos .= chr(27) . 'm'; // Cut paper
        return $escpos;
    }

    public function generatePdf(Sale $sale, int $paperWidth = 80): \Barryvdh\DomPDF\PDF
    {
        try {
            $items = $sale->items()->with('product')->get();
            $html = $this->generatePdfHtml($sale, $items, $paperWidth);
            $widthPt = round($paperWidth * 2.8346);
            return Pdf::loadHTML($html)->setPaper([0, 0, $widthPt, 800], 'portrait');
        } catch (\Exception $e) {
            throw new \RuntimeException('Error al generar PDF: ' . $e->getMessage(), 0, $e);
        }
    }

    private function generatePdfHtml(Sale $sale, $items, int $paperWidth = 80): string
    {
        $is58 = $paperWidth <= 58;
        $bodyPad  = $is58 ? '2.5mm' : '4mm';
        $bodyFs   = $is58 ? '6.5pt' : '7.5pt';
        $headFs   = $is58 ? '9pt' : '10pt';
        $thFs     = $is58 ? '6pt' : '7pt';
        $itemFs   = $is58 ? '6pt' : '7pt';
        $grandFs  = $is58 ? '7.5pt' : '8.5pt';
        $footFs   = $is58 ? '5.5pt' : '6.5pt';

        $company = '=== PUNTO DE VENTA ===';
        $rfc = 'RFC: XXXX-XXXXXX-XXX';
        $folio = 'Folio: ' . ($sale->folio ?? $sale->id);
        $fecha = 'Fecha: ' . DateUtils::formatLocale($sale->created_at);
        $atendio = 'Atendió: ' . e($sale->user?->name ?? 'N/A');

        $html = '<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<style>
    @page { margin: 0; padding: 0; }
    body {
        margin: 0;
        padding: ' . $bodyPad . ' ' . $bodyPad . ';
        font-family: "Courier", monospace;
        font-size: ' . $bodyFs . ';
        line-height: 1.3;
        word-wrap: break-word;
        white-space: normal;
    }
    .header { text-align: center; font-size: ' . $headFs . '; margin-bottom: 0.8mm; font-weight: bold; }
    .info { margin: 0.3mm 0; word-wrap: break-word; }
    hr.divider { border: none; border-top: 1px dashed #000; margin: 0.6mm 0; }

    table.items { width: 100%; border-collapse: collapse; margin: 0; }
    table.items th {
        border-bottom: 1px dashed #000;
        padding: 0.5mm 0;
        font-size: ' . $thFs . ';
    }
    .col-prod { width: 55%; text-align: left; }
    .col-qty  { width: 15%; text-align: center; }
    .col-total{ width: 30%; text-align: right; }

    .item-name {
        word-wrap: break-word;
        white-space: normal;
        padding: 0.5mm 0;
        font-size: ' . $itemFs . ';
        vertical-align: top;
    }
    .item-qty {
        white-space: nowrap;
        padding: 0.5mm 0;
        text-align: center;
        font-size: ' . $itemFs . ';
        vertical-align: top;
    }
    .item-total {
        white-space: nowrap;
        padding: 0.5mm 0;
        text-align: right;
        font-size: ' . $itemFs . ';
        vertical-align: top;
    }

    table.totals { width: 100%; border-collapse: collapse; margin: 0; }
    table.totals td { padding: 0.3mm 0; white-space: nowrap; }
    .tot-label { width: 70%; text-align: left; }
    .tot-value { width: 30%; text-align: right; }
    .grand-label { width: 70%; text-align: left; font-weight: bold; font-size: ' . $grandFs . '; }
    .grand-value { width: 30%; text-align: right; font-weight: bold; font-size: ' . $grandFs . '; }

    .footer { text-align: center; margin-top: 1.5mm; font-size: ' . $footFs . '; }
</style>
</head>
<body>
<div class="ticket">
    <div class="header">' . $company . '</div>
    <div class="info">' . $rfc . '</div>
    <div class="info">' . $folio . '</div>
    <div class="info">' . $fecha . '</div>
    <div class="info">' . $atendio . '</div>';

        if ($sale->customer) {
            $html .= '<div class="info">Cliente: ' . e($sale->customer->name) . '</div>';
        }

        $html .= '
    <hr class="divider"/>
    <table class="items">
        <thead>
            <tr><th class="col-prod">ARTÍCULO</th><th class="col-qty">CANT</th><th class="col-total">IMPORTE</th></tr>
        </thead>
        <tbody>';

        foreach ($items as $item) {
            $name = $item->product?->name ?? 'Producto #' . $item->product_id;
            $qty = (int) $item->quantity;
            $subtotal = number_format((float) $item->subtotal, 2);

            $html .= '
            <tr><td class="item-name">' . e($name) . '</td><td class="item-qty">' . $qty . '</td><td class="item-total">$' . $subtotal . '</td></tr>';
        }

        $html .= '
        </tbody>
    </table>
    <hr class="divider"/>
    <table class="totals">
        <tr><td class="tot-label">SUBTOTAL:</td><td class="tot-value">$' . number_format((float) $sale->subtotal, 2) . '</td></tr>';

        if ((float) $sale->discount_amount > 0) {
            $html .= '<tr><td class="tot-label">DESCUENTO:</td><td class="tot-value">-$' . number_format((float) $sale->discount_amount, 2) . '</td></tr>';
        }

        $html .= '
        <tr><td class="grand-label">TOTAL:</td><td class="grand-value">$' . number_format((float) $sale->total, 2) . '</td></tr>
    </table>';

        if ((float) ($sale->received_amount ?? 0) > 0) {
            $html .= '
    <hr class="divider"/>
    <table class="totals">
        <tr><td class="tot-label">Pagó:</td><td class="tot-value">$' . number_format((float) $sale->received_amount, 2) . '</td></tr>
        <tr><td class="tot-label">Cambio:</td><td class="tot-value">$' . number_format((float) ($sale->change ?? 0), 2) . '</td></tr>
        <tr><td class="tot-label">Método:</td><td class="tot-value">' . strtoupper($sale->payment_method ?? 'N/A') . '</td></tr>
    </table>';
        } else {
            $html .= '
    <hr class="divider"/>
    <div class="info">Método: ' . strtoupper($sale->payment_method ?? 'N/A') . '</div>';
        }

        if ($sale->notes) {
            $html .= '<div class="info">Notas: ' . e($sale->notes) . '</div>';
        }

        $html .= '
    <div class="footer">¡Gracias por su compra!</div>
</div>
</body>
</html>';

        return $html;
    }

    private function buildTicketLines(Sale $sale, $items, int $width): array
    {
        $lines = [];
        $lines[] = '=== CENTRO COMERCIAL ===';
        $lines[] = 'RFC: XXXX-XXXXXX-XXX';
        $lines[] = 'Folio: ' . ($sale->folio ?? $sale->id);
        $lines[] = 'Fecha: ' . DateUtils::formatLocale($sale->created_at);
        $lines[] = 'Atendió: ' . ($sale->user?->name ?? 'N/A');
        $lines[] = str_repeat('-', $width);
        $lines[] = 'ARTÍCULO         QTY  IMPORTE';
        $lines[] = str_repeat('-', $width);

        foreach ($items as $item) {
            $name = mb_substr($item->product?->name ?? $item->product_id, 0, 16);
            $qty = str_pad((string) $item->quantity, 4, ' ', STR_PAD_LEFT);
            $total = number_format((float) $item->subtotal, 2);
            $lines[] = $name . str_repeat(' ', max(1, 17 - mb_strlen($name))) . $qty . '  ' . $total;
        }

        $lines[] = str_repeat('-', $width);
        $lines[] = 'SUBTOTAL:     ' . str_pad(number_format((float) $sale->subtotal, 2), 10, ' ', STR_PAD_LEFT);

        if ((float) $sale->discount_amount > 0) {
            $lines[] = 'DESCUENTO:    -' . str_pad(number_format((float) $sale->discount_amount, 2), 9, ' ', STR_PAD_LEFT);
        }

        $lines[] = 'TOTAL:        ' . str_pad(number_format((float) $sale->total, 2), 10, ' ', STR_PAD_LEFT);

        if ((float) ($sale->received_amount ?? 0) > 0) {
            $lines[] = 'Pagó:         ' . str_pad(number_format((float) $sale->received_amount, 2), 10, ' ', STR_PAD_LEFT);
            $lines[] = 'Cambio:       ' . str_pad(number_format((float) ($sale->change ?? 0), 2), 10, ' ', STR_PAD_LEFT);
        }

        $lines[] = 'Método: ' . strtoupper($sale->payment_method ?? 'N/A');
        $lines[] = '';
        $lines[] = '¡Gracias por su compra!';
        $lines[] = '';

        return $lines;
    }
}
