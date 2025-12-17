import supabase from './src/utils/supabaseClient.js';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testIntegration() {
    console.log('--- Starting Integration Test ---');

    // 1. Setup: Get a user or create a temporary one for testing?
    // We assume a user exists. Let's try to pick one from DB.
    const { data: user, error: userError } = await supabase.from('user').select('*').limit(1).single();

    if (userError || !user) {
        console.error('No user found in DB to test with. Please register a user first.');
        return;
    }

    console.log(`Using user: ${user.full_name} (${user.user_id})`);

    // 2. Simulate Login (Create Session)
    const expireTime = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    const ssn = { user_id: user.user_id, email: user.email, phone: user.phone, fullName: user.full_name };

    // Clean up old sessions for this test
    await supabase.from('session').delete().eq('sid', user.phone);

    const { error: sessErr } = await supabase
        .from('session')
        .insert([{ sid: user.phone, sess: ssn, expire: expireTime }]);

    if (sessErr) {
        console.error('Failed to create session:', sessErr);
        return;
    }
    console.log('Session created manually for testing.');

    // 3. Test Chatbot API
    console.log('\n--- Testing Chatbot API ---');
    try {
        const chatRes = await fetch(`${BASE_URL}/api/chatbot/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'halo',
                user_id: user.user_id // In real app, this might come from token/session, but controller expects it in body for now per our code? 
                // Wait, our code expects user_id in body AND checks session.
            })
        });
        const text = await chatRes.text();
        console.log('Raw Response:', text);
        let chatData;
        try {
            chatData = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
        }

        console.log(`Status: ${chatRes.status}`);
        console.log('Response:', chatData);

        if (chatRes.status === 200) {
            console.log('Chat API Success!');
            // Verify DB
            const { data: logs } = await supabase.from('interaction_log')
                .select('*')
                .eq('user_id', user.user_id)
                .order('tanggal_interaksi', { ascending: false })
                .limit(1);
            if (logs && logs.length > 0 && logs[0].message === 'halo') {
                console.log('DB Verification: Log found in interaction_log.');
            } else {
                console.error('DB Verification FAILED: Log not found.');
            }
        }
    } catch (err) {
        console.error('Chat API Error:', err);
    }

    // 4. Test Booking API
    console.log('\n--- Testing Booking API ---');
    // Need a valid book ID.
    const { data: buku } = await supabase.from('buku').select('buku_id').limit(1).single();
    if (!buku) {
        console.log('No books available to test booking.');
    } else {
        try {
            const bookingBody = {
                user_id: user.user_id,
                buku_id: buku.buku_id,
                tanggal_booking: new Date().toISOString().split('T')[0],
                status: 'pending'
            };

            const bookRes = await fetch(`${BASE_URL}/api/booking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingBody)
            });
            const bookData = await bookRes.json();
            console.log(`Status: ${bookRes.status}`);
            console.log('Response:', bookData);
            if (bookRes.status === 201) {
                console.log('Booking API Success!');
            }
        } catch (err) {
            console.error('Booking API Error:', err);
        }
    }

    console.log('\n--- Test Finished ---');
}

testIntegration();
