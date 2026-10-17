<?php

return [
    'currency' => 'INR',
    'management_key' => env('MENU_MANAGEMENT_KEY'),
    'categories' => ['Starters', 'Main Course', 'Pizza', 'Burgers', 'Pasta', 'Salads', 'Sides', 'Drinks', 'Desserts'],
    'menu' => [
        ['id' => 'pizza-margherita', 'name' => 'Margherita Pizza', 'category' => 'Pizza', 'description' => 'Tomato, mozzarella, basil.', 'price' => 349],
        ['id' => 'burger-classic', 'name' => 'Classic Burger', 'category' => 'Burgers', 'description' => 'Grilled patty, lettuce, tomato, house sauce.', 'price' => 299],
        ['id' => 'pasta-alfredo', 'name' => 'Creamy Alfredo Pasta', 'category' => 'Pasta', 'description' => 'Cream sauce, parmesan, cracked pepper.', 'price' => 329],
        ['id' => 'salad-caesar', 'name' => 'Caesar Salad', 'category' => 'Salads', 'description' => 'Romaine, parmesan, toasted croutons.', 'price' => 229],
        ['id' => 'fries-classic', 'name' => 'French Fries', 'category' => 'Sides', 'description' => 'Golden fries with sea salt.', 'price' => 129],
    ],
];
