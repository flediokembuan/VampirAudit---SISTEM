<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * UC-02 User Management
 */
class UserManagementService
{
    public function getUsersAndRoles(): Collection
    {
        return User::query()->orderBy('name')->get();
    }

    public function addUser(array|User $user): bool
    {
        if ($user instanceof User) {
            $user->save();
            return true;
        }

        $user['email'] = strtolower($user['email']);
        $user['is_active'] = $user['is_active'] ?? true;
        User::query()->create($user);

        return true;
    }

    public function updateUser(array|User $user, ?User $target = null): bool
    {
        if ($user instanceof User) {
            $user->save();

            if (! $user->is_active) {
                $user->tokens()->delete();
            }

            return true;
        }

        $target ??= User::query()->findOrFail($user['id']);

        if (array_key_exists('email', $user)) {
            $user['email'] = strtolower($user['email']);
        }

        if (empty($user['password'])) {
            unset($user['password']);
        }

        $target->update($user);

        if (! $target->is_active) {
            $target->tokens()->delete();
        }

        return true;
    }

    public function deactivateUser(int $userId): bool
    {
        $user = User::query()->findOrFail($userId);
        $user->update(['is_active' => false]);
        $user->tokens()->delete();

        return true;
    }

    public function validateUserData(array|User $user): bool
    {
        if ($user instanceof User) {
            return ! empty($user->name) && ! empty($user->email) && $user->role !== null;
        }

        return isset($user['name'], $user['email'], $user['role']);
    }

    public function ensureAnotherActiveAdminExists(User $user): void
    {
        $activeAdmins = User::query()
            ->where('role', UserRole::ADMIN->value)
            ->where('is_active', true)
            ->whereKeyNot($user->getKey())
            ->count();

        if ($activeAdmins === 0) {
            throw ValidationException::withMessages([
                'role' => 'Minimal satu akun Admin aktif harus tersedia.',
            ]);
        }
    }
}
