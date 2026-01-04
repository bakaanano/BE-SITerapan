import fetch from 'node-fetch';

const email = "testing2@testing.com";
const password = "newpassword123";
const bukuId = 15; // Filosofi Teras

async function getStock(id) {
    try {
        const res = await fetch(`http://localhost:3000/api/catalog`);
        if (res.status === 200) {
            const data = await res.json();
            console.log("GetStock Response:", JSON.stringify(data).substring(0, 100) + "..."); // Log short summary
            const book = data.data.find(b => b.buku_id === id);
            return book ? book.stok : 'book_not_found';
        }
    } catch { }
    return 'unknown';
}

async function runTest() {
    console.log("Starting test with Book ID:", bukuId);

    try {
        // 1. Initial Stock
        const initialStock = await getStock(bukuId);
        console.log("Initial Stock:", initialStock);

        // 2. Login
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginResponse.json();

        if (loginResponse.status !== 200) {
            console.log("Login Failed:", loginResponse.status, loginData);
            return;
        }
        const userId = loginData.user.id;
        console.log(`User ID: ${userId} logged in.`);

        // 3. Create Booking
        const date = new Date().toISOString().split('T')[0];
        const createRes = await fetch('http://localhost:3000/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                buku_id: bukuId,
                tanggal_booking: date,
                status: 'pending' // pending should reduce stock
            })
        });
        const createData = await createRes.json();

        if (createRes.status !== 201) {
            console.log("Create Booking Failed:", createRes.status, createData);
            return;
        }
        const bookingId = createData.data[0].booking_id;
        console.log("Booking Created ID:", bookingId);

        const stockAfterBooking = await getStock(bukuId);
        console.log("Stock After Booking:", stockAfterBooking);

        if (initialStock !== 'unknown' && stockAfterBooking !== 'unknown') {
            if (stockAfterBooking !== initialStock - 1) {
                console.log("WARNING: Stock did not decrease by 1. Check createBooking logic.");
            }
        }

        // 4. Cancel Booking
        const cancelRes = await fetch(`http://localhost:3000/api/booking/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                status: 'cancelled'
            })
        });
        const cancelData = await cancelRes.json();
        console.log("Cancel Result:", cancelRes.status, cancelData.message);

        // 5. Final Stock
        const finalStock = await getStock(bukuId);
        console.log("Final Stock:", finalStock);

        if (finalStock === initialStock && stockAfterBooking < initialStock) {
            console.log("SUCCESS: Stock decremented then incremented back.");
        } else {
            console.log("FAILURE: Stock mismatch.");
        }

    } catch (err) {
        console.error(err);
    }
}

runTest();
