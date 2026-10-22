<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Sample API Routes for PHP Debug Studio
|--------------------------------------------------------------------------
*/

Route::get('/up', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/api/users', [UserController::class, 'index']);
Route::post('/api/users', [UserController::class, 'store']);
