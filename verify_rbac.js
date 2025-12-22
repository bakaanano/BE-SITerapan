import supabase from './src/utils/supabaseClient.js';
import { updateBookingStatus } from './src/controller/booking.controller.js';

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

async function runTests() {
    console.log('Starting RBAC Verification...');

    // 1. Setup Data
    const randomId = Math.floor(Math.random() * 10000000);
    const userPhone = `081${randomId}`; // ~10-11 digits
    const adminPhone = `082${randomId}`;

    // Create User
    const { data: user, error: userErr } = await supabase.from('user').insert([{
        full_name: 'Test User',
        email: `user${randomId}@test.com`,
        phone: userPhone,
        address: 'Test Address',
        password: 'password',
        role: 'user'
    }]).select().single();
    if (userErr) console.error('Create user failed', userErr);

    // Create Admin
    const { data: admin, error: adminErr } = await supabase.from('user').insert([{
        full_name: 'Test Admin',
        email: `admin${randomId}@test.com`,
        phone: adminPhone,
        address: 'Test Address',
        password: 'password',
        role: 'admin'
    }]).select().single();
    if (adminErr) console.error('Create admin failed', adminErr);

    // Create Sessions
    const expireTime = new Date(Date.now() + 3600 * 1000);
    await supabase.from('session').insert([
        { sid: user.phone, sess: { user_id: user.user_id, role: 'user' }, expire: expireTime },
        { sid: admin.phone, sess: { user_id: admin.user_id, role: 'admin' }, expire: expireTime }
    ]);

    // Create Booking (using a valid book id, assuming ID 1 exists, or we insert a dummy book)
    const { data: book, error: bookErr } = await supabase.from('buku').insert([{
        Judul: `Test Book ${randomId}`,
        Penulis: 'Tester',
        stok: 10,
        Jenis: 'Fiksi',
        Kategori: 'Umum',
        Tags: 'Test',
        Sinopsis: 'Test Sinopsis'
    }]).select().single();

    if (bookErr) {
        console.error('Create book failed', bookErr);
        return;
    }

    const { data: booking } = await supabase.from('booking').insert([{
        user_id: user.user_id,
        buku_id: book.buku_id,
        tanggal_booking: new Date(),
        status: 'pending'
    }]).select().single();

    console.log(`Setup complete. Booking ID: ${booking.booking_id}`);

    // Test 1: User tries to Approve (Should Fail)
    console.log('\nTest 1: User tries to Approve (Expect 403)');
    const req1 = {
        params: { id: booking.booking_id },
        body: { status: 'approved', user_id: user.user_id }
    };
    const res1 = mockRes();
    await updateBookingStatus(req1, res1);
    console.log(`Result: ${res1.statusCode} - ${res1.body?.message}`);

    // Test 2: Admin tries to Approve (Should Success)
    console.log('\nTest 2: Admin tries to Approve (Expect 200)');
    const req2 = {
        params: { id: booking.booking_id },
        body: { status: 'approved', user_id: admin.user_id } // Admin ID
    };
    const res2 = mockRes();
    await updateBookingStatus(req2, res2);
    console.log(`Result: ${res2.statusCode} - ${res2.body?.message}`);

    // Test 3: User tries to Cancel (Should Fail because it's already approved)
    console.log('\nTest 3: User tries to Cancel APPROVED booking (Expect 400)');
    const req3 = {
        params: { id: booking.booking_id },
        body: { status: 'cancelled', user_id: user.user_id }
    };
    const res3 = mockRes();
    await updateBookingStatus(req3, res3);
    console.log(`Result: ${res3.statusCode} - ${res3.body?.message}`);

    // Reset status to pending for next test
    await supabase.from('booking').update({ status: 'pending' }).eq('booking_id', booking.booking_id);

    // Test 4: User tries to Cancel Pending (Should Success)
    console.log('\nTest 4: User tries to Cancel PENDING booking (Expect 200)');
    const req4 = {
        params: { id: booking.booking_id },
        body: { status: 'cancelled', user_id: user.user_id }
    };
    const res4 = mockRes();
    await updateBookingStatus(req4, res4);
    console.log(`Result: ${res4.statusCode} - ${res4.body?.message}`);

    // Cleanup
    console.log('\nCleaning up...');
    await supabase.from('booking').delete().eq('booking_id', booking.booking_id);
    await supabase.from('buku').delete().eq('buku_id', book.buku_id);
    await supabase.from('session').delete().in('sid', [user.phone, admin.phone]);
    await supabase.from('user').delete().in('user_id', [user.user_id, admin.user_id]);
    console.log('Done.');
}

runTests();
