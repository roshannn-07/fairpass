// File: src/lib/supabase-mock.ts

// In-Memory store for events created during the session
const MOCK_EVENTS_STORE: any[] = [];
// Use a unique ID generator for mock event_id
let nextMockEventId = 1000;

export const createMockClient = () => {
    console.log("[DEMO MOCK] Using Mock Supabase Client. Data is IN-MEMORY (Non-Persistent).");

    const mockInsert = (data: any[]) => ({
        select: () => ({
            single: async () => {
                const newEvent = { ...data[0], event_id: nextMockEventId++ };
                MOCK_EVENTS_STORE.push(newEvent); // SAVE to in-memory store
                return { data: newEvent, error: null };
            }
        })
    });
    
    // --- Mock for SELECT queries ---
    const mockSelect = (tableName: string) => {
        
        // This object represents a chainable query builder like .eq().select()
        const queryBuilder = {
            // Filter by creator (the query used in /host)
            eq: (column: string, value: any) => {
                if (tableName === 'events' && column === 'created_by') {
                    // Filter the in-memory store by the current host's address
                    return {
                        order: () => ({
                            data: MOCK_EVENTS_STORE.filter(e => e.created_by === value),
                            error: null
                        })
                    };
                }
                // Mock for other tables like 'users' where .eq().single() is called
                if (tableName === 'users' && column === 'wallet_address') {
                    // Simulate a default/new user profile creation/lookup
                    return {
                        single: async () => ({
                            data: { 
                                wallet_address: value, 
                                created_at: new Date().toISOString(),
                                first_name: 'Mock',
                                last_name: 'User'
                            },
                            error: null
                        }),
                    };
                }
                // Default handling for select
                return queryBuilder;
            },
            
            // Terminal call to get list (for /host)
            select: () => queryBuilder,
            // Mock the order call
            order: () => ({ data: MOCK_EVENTS_STORE, error: null }),
            // Mock the single call
            single: async () => ({ data: null, error: null }), 
            
            // Mock other common methods
            not: () => queryBuilder,
            in: () => queryBuilder, 
        };

        return queryBuilder;
    };
    // --- End Mock for SELECT queries ---

    const mockClient = {
        from: (tableName: string) => ({
            insert: mockInsert,
            select: () => mockSelect(tableName).select(),
            // Re-implementing mock chainers to support the /host page structure
            eq: mockSelect(tableName).eq,
            not: mockSelect(tableName).not,
            order: mockSelect(tableName).order,
            
        }),
        // Mock RPC call for future leaderboard implementation
        rpc: async () => ({ data: null, error: { message: "Mocked: RPC Call" } }),
    };

    return mockClient;
};