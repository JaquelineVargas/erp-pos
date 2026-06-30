<?php

namespace App\Enums;

enum ArqueoStatus: string
{
    case PENDING = 'pending';
    case CUADRADO = 'cuadrado';
    case SOBRANTE = 'sobrante';
    case FALTANTE = 'faltante';

    public function label(): string
    {
        return match($this) {
            self::PENDING => 'Pendiente',
            self::CUADRADO => 'Cuadrado',
            self::SOBRANTE => 'Sobrante',
            self::FALTANTE => 'Faltante',
        };
    }
}
