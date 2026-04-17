import { vi } from "vitest";

// Create a shared mock instance so tests can access the same getUser mock
export const mockGetUser = vi.fn().mockResolvedValue({
    data: {
        user: {
            id: "test-coach-id",
            email: "coach@test.com",
            user_metadata: { full_name: "Test Coach" },
        },
    },
    error: null,
});

const mockSupabaseClient = {
    auth: {
        getUser: mockGetUser,
    },
};

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => mockSupabaseClient),
}));
