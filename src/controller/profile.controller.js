import supabase from '../utils/supabaseClient.js';
import { checkUserLogin } from '../utils/authHelper.js';

export const getProfile = async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ message: 'User ID wajib disertakan' });
        }

        // 1. Verifikasi Login
        const isLoggedIn = await checkUserLogin(user_id);
        if (!isLoggedIn) {
            return res.status(403).json({ message: 'Akses ditolak. Validasi session gagal.' });
        }

        // 2. Ambil data User dikurangi password
        const { data: user, error: userError } = await supabase
            .from('user')
            .select('user_id, full_name, email, phone, address')
            .eq('user_id', user_id)
            .single();

        if (userError || !user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        // 3. Ambil data Booking beserta detail Bukunya
        const { data: bookings, error: bookingError } = await supabase
            .from('booking')
            .select(`
                booking_id,
                tanggal_booking,
                status,
                buku:buku_id (
                    buku_id,
                    "Judul",
                    "Penulis",
                    cover,
                    "Kategori: kategori"
                )
            `)
            .eq('user_id', user_id);

        if (bookingError) {
            // Kita anggap error booking tidak fatal untuk profile, tapi user perlu tahu
            console.error("Error fetching bookings:", bookingError);
            // Tetap lanjut, tapi bookings kosong
        }

        // 4. Return Data Lengkap
        res.status(200).json({
            message: 'Berhasil mengambil data profile',
            user: user,
            bookings: bookings || []
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { user_id, full_name, address, password } = req.body;

        if (!user_id) {
            return res.status(400).json({ message: 'User ID wajib disertakan' });
        }

        // 1. Verifikasi Login
        const isLoggedIn = await checkUserLogin(user_id);
        if (!isLoggedIn) {
            return res.status(403).json({ message: 'Akses ditolak. Validasi session gagal.' });
        }

        // 2. Siapkan data update
        const updates = {};
        if (full_name) updates.full_name = full_name;
        if (address) updates.address = address;
        if (password) updates.password = password; // Warning: Storing plain text password as per existing pattern

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'Tidak ada data yang diupdate' });
        }

        // 3. Update ke Supabase
        const { data, error } = await supabase
            .from('user')
            .update(updates)
            .eq('user_id', user_id)
            .select();

        if (error) {
            throw error;
        }

        res.status(200).json({
            message: 'Profile berhasil diupdate',
            updatedData: data[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
