<?php

namespace App\Enums;

enum ArqueoMovementType: string
{
    case CASH_SALE = 'cash_sale';
    case CARD_SALE = 'card_sale';
    case TRANSFER_SALE = 'transfer_sale';
    case QR_SALE = 'qr_sale';
    case MANUAL_INCOME = 'manual_income';
    case EXPENSE = 'expense';
    case WITHDRAWAL = 'withdrawal';
    case RETURN = 'return';
    case VOID = 'void';

    public function label(): string
    {
        return match($this) {
            self::CASH_SALE => 'Venta Efectivo',
            self::CARD_SALE => 'Venta Tarjeta',
            self::TRANSFER_SALE => 'Venta Transferencia',
            self::QR_SALE => 'Venta QR',
            self::MANUAL_INCOME => 'Ingreso Manual',
            self::EXPENSE => 'Gasto',
            self::WITHDRAWAL => 'Retiro',
            self::RETURN => 'Devolución',
            self::VOID => 'Anulación',
        };
    }
}
