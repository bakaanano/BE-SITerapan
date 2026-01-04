import supabase from '../utils/supabaseClient.js';
import { checkUserLogin, getUserRole } from '../utils/authHelper.js';

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
          Penulis,
          cover
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
        const { status, user_id } = req.body; // user_id (requester) wajib dikirim

        if (!status) {
            return res.status(400).json({ message: 'Status baru wajib diisi' });
        }

        if (!user_id) {
            return res.status(400).json({ message: 'User ID pelaksana wajib disertakan untuk validasi akses' });
        }

        // Cek Role User
        const role = await getUserRole(user_id);

        if (!role) {
            return res.status(403).json({ message: 'Akses ditolak: User tidak valid atau session habis' });
        }

        // Ambil data booking lama untuk validasi kepemilikan
        const { data: booking, error: fetchError } = await supabase
            .from('booking')
            .select('*')
            .eq('booking_id', id)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ message: 'Booking tidak ditemukan' });
        }

        // Logic RBAC
        if (role === 'admin') {
            // Admin bebas update status apa saja
        } else if (role === 'user') {
            // User hanya boleh akses booking milik sendiri
            if (booking.user_id !== user_id) {
                return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk mengubah booking ini' });
            }

            // --- PERUBAHAN LOGIC DI SINI ---
            
            // 1. Logic Ajukan (Draft -> Pending)
            if (status === 'pending') {
                if (booking.status !== 'draft') {
                     return res.status(400).json({ message: 'Hanya booking status draft yang bisa diajukan' });
                }
            } 
            // 2. Logic Cancel (Draft/Pending -> Cancelled)
            else if (status === 'cancelled') {
                if (!['draft', 'pending'].includes(booking.status)) {
                    return res.status(400).json({ message: 'Hanya booking status draft atau pending yang bisa dibatalkan' });
                }
            } 
            // 3. Status lain dilarang untuk user
            else {
                return res.status(403).json({ message: 'User hanya dapat mengajukan atau membatalkan booking' });
            }
        } else {
            return res.status(403).json({ message: 'Role tidak dikenali' });
        }

        // Logic Pengembalian Stok
        // Jika status berubah menjadi 'returned' atau 'cancelled' (dan sebelumnya bukan salah satunya), kembalikan stok
        if ((status === 'returned' || status === 'cancelled') && booking.status !== status) {
            // Cek stok buku saat ini
            const { data: bukuData, error: bukuError } = await supabase
                .from('buku')
                .select('stok')
                .eq('buku_id', booking.buku_id)
                .single();

            if (!bukuError && bukuData) {
                // Update stok + 1
                await supabase
                    .from('buku')
                    .update({ stok: bukuData.stok + 1 })
                    .eq('buku_id', booking.buku_id);
            }
        }

        const { data, error } = await supabase
            .from('booking')
            .update({ status })
            .eq('booking_id', id)
            .select();

        if (error) throw error;

        res.status(200).json({ message: 'Status booking berhasil diupdate', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
