// File: src/lib/supabase-mock.ts

// MOCK STORE - CRITICAL: Initialize as an empty array here.
// The default demo event will be added dynamically below.
const MOCK_EVENTS_STORE: any[] = []; 

// Use a unique ID generator for mock event_id
let nextMockEventId = 1000;

// Helper to add the default event if the store is empty
function ensureDefaultEventExists(hostAddress: string) {
    if (MOCK_EVENTS_STORE.length === 0) {
        console.log(`[MOCK DB INIT] Adding default event for new host: ${hostAddress}`);
        MOCK_EVENTS_STORE.push({
            event_id: 999,
            event_name: "Mock Demo Launch Event",
            event_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            description: "This is a mock event to demonstrate the host dashboard functionality.",
            location: "Algorand TestNet",
            max_tickets: 500,
            ticket_price: 10,
            image_url: "ipfs://QmVitaDemoHashForMockImage",
            created_by: hostAddress, // *** CRITICAL FIX: Assigns to the actual host address ***
        });
        nextMockEventId = 1001;
    }
}

export const createMockClient = () => {
    console.log("[DEMO MOCK] Using Mock Supabase Client. Data is IN-MEMORY (Non-Persistent).");

    const mockInsert = (tableName: string) => (data: any[]) => ({
        select: () => ({
            single: async () => {
                if (tableName === 'events') {
                    const newEvent = { ...data[0], event_id: nextMockEventId++ };
                    MOCK_EVENTS_STORE.push(newEvent); // SAVE to in-memory store
                    console.log(`[MOCK DB] Event created and saved: ${newEvent.event_name}`);
                    return { data: newEvent, error: null };
                }
                if (tableName === 'tickets') {
                    return { data: data, error: null };
                }
                return { data: data[0] || null, error: null };
            }
        })
    });
    
    // --- Mock for SELECT queries ---
    const mockSelect = (tableName: string) => {
        
        const queryBuilder = {
            eq: (column: string, value: any) => {
                if (tableName === 'events' && column === 'created_by') {
                    // *** CRITICAL: Ensure default event exists for this specific host on first query ***
                    ensureDefaultEventExists(value);
                    
                    // FILTER MOCK EVENTS STORE
                    const filteredEvents = MOCK_EVENTS_STORE.filter(e => e.created_by === value);
                    return {
                        order: () => ({
                            data: filteredEvents,
                            error: null
                        }),
                        select: () => queryBuilder,
                    };
                }
                if (tableName === 'events' && column === 'event_id') {
                    // Filter for event detail page
                    return {
                        single: async () => ({
                            data: MOCK_EVENTS_STORE.find(e => e.event_id.toString() === value.toString()) || null,
                            error: null
                        }),
                        select: () => queryBuilder,
                    };
                }
                // Mock for 'users' lookup
                if (tableName === 'users' && column === 'wallet_address') {
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
                return queryBuilder;
            },
            
            // ... (rest of query methods unchanged)
            order: () => ({ data: MOCK_EVENTS_STORE, error: null }),
            single: async () => ({ data: null, error: null }), 
            select: () => queryBuilder,
            not: () => queryBuilder,
            in: () => queryBuilder, 
        };

        return queryBuilder;
    };
    // --- End Mock for SELECT queries ---

    const mockClient = {
        from: (tableName: string) => ({
            insert: mockInsert(tableName),
            select: () => mockSelect(tableName),
            eq: mockSelect(tableName).eq,
            not: mockSelect(tableName).not,
            order: mockSelect(tableName).order,
            upsert: mockInsert(tableName),
        }),
        rpc: async () => ({ data: null, error: { message: "Mocked: RPC Call" } }),
    };

    return mockClient;
};