<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $fillable = [
        'event_id', 'application_id', 'event_name', 'event_type', 'source',
        'anonymous_id', 'user_id', 'path', 'occurred_at', 'received_at',
        'properties', 'context',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'immutable_datetime',
            'received_at' => 'immutable_datetime',
            'properties' => 'array',
            'context' => 'array',
        ];
    }
}
