import supabase from './src/utils/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3000/api/booking';

async function verify() {
    console.log('Starting verification...');

    // 1. Setup Test Data
    console.log('Setting up test data...');

    // Find or create user
    let userId;
    const { data: users } = await supabase.from('user').select('user_id').limit(1);
    if (users && users.length > 0) {
        userId = users[0].user_id;
    } else {
        // Basic user creation if needed, fields might vary based on your schema reqs
        console.log('No user found, this might fail if required fields are missing.');
        return;
        // Ideally we should create one but let's assume at least one user exists for now or the previous check wouldn't have failed on "or book" if user was found.
    }

    // Create a test book with stock
    const testBook = {
        Jenis: 'Fiksi',
        Judul: 'Buku Test Automation',
        Penulis: 'Bot',
        Kategori: 'Test',
        Tags: 'test',
        Sinopsis: 'Created by automation script',
        stok: 10
    };

    const { data: newBook, error: createBookError } = await supabase
        .from('buku')
        .insert([testBook])
        .select()
        .single();

    if (createBookError) {
        console.error('Failed to create test book:', createBookError);
        return;
    }

    const bukuId = newBook.buku_id;
    console.log(`Using User ID: ${userId}, Created Test Book ID: ${bukuId}`);

    try {
        // 2. Create Booking
        console.log('Testing Create Booking...');
        const createRes = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                buku_id: bukuId,
                tanggal_booking: new Date().toISOString().split('T')[0],
                status: 'pending'
            })
        });

        if (!createRes.ok) {
            console.error('Create Booking Failed:', await createRes.text());
            return;
        }

        const createData = await createRes.json();
        console.log('Create Booking Success:', createData);

        // Handle potential array or single object response depending on Supabase version/controller
        const bookingData = Array.isArray(createData.data) ? createData.data[0] : createData.data;
        const bookingId = bookingData.Booking_id || bookingData.booking_id; // Handle case sensitivity

        // 3. Get User Bookings
        console.log(`Testing Get User Bookings for User ${userId}...`);
        const getRes = await fetch(`${BASE_URL}/user/${userId}`);
        const getData = await getRes.json();
        console.log('Get User Bookings Result:', getData);

        // 4. Update Booking Status
        console.log(`Testing Update Booking Status for Booking ${bookingId}...`);
        const updateRes = await fetch(`${BASE_URL}/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'confirmed' })
        });

        const updateData = await updateRes.json();
        console.log('Update Booking Status Result:', updateData);

    } catch (e) {
        console.error('Test execution error:', e);
    } finally {
        // 5. Cleanup
        console.log('Cleaning up...');
        // Delete book (will fail if foreign key constraints exist on booking, so delete booking first)
        // Actually we just created the booking, so we can delete it.
        // But if we fail mid-way, we might leave trash.
        // We will try to delete the test book. The constraint will block it if booking exists.

        // Delete bookings for this book
        const { error: delBookingErr } = await supabase.from('booking').delete().eq('buku_id', bukuId);
        if (delBookingErr) console.error('Failed to delete test bookings:', delBookingErr.message);

        const { error: delBookErr } = await supabase.from('buku').delete().eq('buku_id', bukuId);
        if (delBookErr) console.error('Failed to delete test book:', delBookErr.message);
        else console.log('Cleanup success.');
    }
}

verify();
