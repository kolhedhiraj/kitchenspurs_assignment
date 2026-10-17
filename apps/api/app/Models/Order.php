<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

    public const STATUS_LABELS = [
        'pending' => 'Pending', 'confirmed' => 'Confirmed', 'preparing' => 'Preparing',
        'out_for_delivery' => 'Out for Delivery', 'delivered' => 'Delivered', 'cancelled' => 'Cancelled',
    ];

    protected $fillable = ['total_amount', 'currency', 'status'];

    protected function casts(): array
    {
        return ['total_amount' => 'integer'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
