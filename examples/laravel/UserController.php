<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Zoventra\DebugStudio\DebugStudio;

class UserController
{
    /**
     * Sample endpoint demonstrating automatic SQL tracing and span creation.
     */
    public function index(Request $request): JsonResponse
    {
        // 1. Eloquent / Query Builder statement automatically captured via DB::listen
        $users = DB::table('users')
            ->select('id', 'name', 'email', 'created_at')
            ->limit(20)
            ->get();

        // 2. Custom application log linked to this request trace
        DebugStudio::recordLog('info', 'Users list retrieved', [
            'count' => count($users),
            'client_ip' => $request->ip(),
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $users,
        ]);
    }

    /**
     * Sample endpoint demonstrating validation and error capture.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
        ]);

        $userId = DB::table('users')->insertGetId([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'created',
            'user_id' => $userId,
        ], 201);
    }
}
