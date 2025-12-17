import supabase from '../utils/supabaseClient.js';
import { checkUserLogin } from '../utils/authHelper.js';

export const createBooking = async (req, res) => {
    try {
        const { user_id, buku_id, tanggal_booking, status } = req.body;

        if (!user_id || !buku_id || !tanggal_booking) {
            return res.status(400).json({ message: 'User ID, Buku ID, dan Tanggal Booking wajib diisi' });
        }

        // Auth check
        const isLoggedIn = await checkUserLogin(user_id);
        if (!isLoggedIn) {
            return res.status(403).json({ message: 'User tidak valid atau session expired' });
        }

        // Cek ketersediaan buku (optional, tapi bagus ada)
        const { data: buku, error: bukuError } = await supabase
            .from('buku')
            .select('stok, Judul')
            .eq('buku_id', buku_id)
            .single();

        if (bukuError || !buku) {
            return res.status(404).json({ message: 'Buku tidak ditemukan' });
        }

        if (buku.stok <= 0) {
            return res.status(400).json({ message: `Stok buku "${buku.Judul}" habis` });
        }

        // Insert booking
        const { data, error } = await supabase
            .from('booking')
            .insert([{
                user_id,
                buku_id,
                tanggal_booking: tanggal_booking,
                status: status || 'pending' // Default status
            }])
            .select();

        if (error) throw error;

        // Kurangi stok buku (optional, uncomment jika perlu update stok otomatis)
        const { error: updateError } = await supabase
          .from('buku')
          .update({ stok: buku.stok - 1 })
          .eq('buku_id', buku_id);

        res.status(201).json({ message: 'Booking berhasil dibuat', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getUserBookings = async (req, res) => {
    try {
        const { user_id } = req.params;

        const { data, error } = await supabase
            .from('booking')
            .select(`
        *,
        buku:buku_id (
          Judul,
          Penulis
        )
      `)
            .eq('user_id', user_id);

        if (error) throw error;

        res.status(200).json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getAllBookings = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('booking')
            .select(`
            *,
            buku:buku_id (Judul),
            user:user_id (full_name)
        `);

        if (error) throw error;

        res.status(200).json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params; // booking_id
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status baru wajib diisi' });
        }

        const { data, error } = await supabase
            .from('booking')
            .update({ status })
            .eq('booking_id', id)
            .select();

        if (error) throw error;

        if (data.length === 0) {
            return res.status(404).json({ message: 'Booking tidak ditemukan' });
        }

        res.status(200).json({ message: 'Status booking berhasil diupdate', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
