import supabase from '../utils/supabaseClient.js'; // Sesuaikan path jika struktur folder berbeda

export const getAllBooks = async (req, res) => {
  try {
    const { data: books, error } = await supabase
      .from('buku') // Ganti dengan nama tabel buku Anda di Supabase
      .select('*'); // Mengambil semua kolom

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!books) {
      // Ini terjadi jika tabel kosong, tapi statusnya tetap 200 dengan array kosong
      return res.status(200).json({ data: [] });
    }

    res.status(200).json({ data: books });
  } catch (err) {
    console.error('Server Error:', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
  }
};