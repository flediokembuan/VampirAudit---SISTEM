<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * UC-01 Authentication
 */
class AuthService
{
    public function verifyCredentials(string $email, string $password): bool
    {
        $user = User::query()->where('email', strtolower($email))->first();

        return $user !== null && Hash::check($password, $user->password);
    }

    public function checkRoleAndStatus(User $user): bool
    {
        return $user->is_active && $user->role !== null;
    }

    public function redirectToDashboard(UserRole $role): string
    {
        return $role->homePath();
    }
}
