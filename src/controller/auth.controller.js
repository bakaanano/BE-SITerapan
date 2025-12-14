import bcrypt from 'bcrypt';
import supabase from '../utils/supabaseClient.js';

export const register = async (req, res) => {
  try {
    const { full_name, email, phone, address, password, confirm_password } = req.body;

    // Validasi sederhana
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Password dan ulangi password tidak cocok' });
    }

    if (!full_name || !email || !phone || !address || !password) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    // Cek apakah user sudah ada berdasarkan email atau no hp
    const { data: existingUser, error: selectError } = await supabase
      .from('user')
      .select('*')
      .or('email.eq.' + email + ',phone.eq.' + phone)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 berarti tidak ditemukan, bisa diabaikan
      throw selectError;
    }

    if (existingUser) {
      return res.status(400).json({ message: 'Email atau No telepon sudah terdaftar' });
    }

    // Hash password
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan ke Supabase
    const { error: insertError } = await supabase
      .from('user')
      .insert([{
        full_name,
        email,
        phone,
        address,
        password
      }]);

    if (insertError) throw insertError;

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ambil user dari Supabase berdasarkan email
    const { data: user, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(400).json({ message: 'Email atau password salah' });
    }

    // Validasi password menggunakan bcrypt
    // const valid = await bcrypt.compare(password, user.password);
    //validasi tanpa bcrypt
    if (password !== user.password) {
      return res.status(400).json({ message: 'Email atau password salah' });
    }

    // Simpan session

    const ssn = { user_id: user.id, email: user.email, phone:user.phone, fullName: user.full_name };
    const expireTime = new Date(Date.now() + 2 * 60 * 60 * 1000); 
    const { error: sessErr } = await supabase
    .from('session')
    .insert([{ sid: user.phone, sess: ssn, expire: expireTime }]);

    if (sessErr) return res.status(500).json({ error: sessErr.message });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    const { phone } = req.body; // ambil user.id dari body

    if (!phone) {
      return res.status(400).json({ error: 'No telepon wajib dikirim' });
    }

    // Cek apakah ada session dengan sid = nim
    const { data, error } = await supabase
      .from('session')
      .select('sid')
      .eq('sid', phone)
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Jika tidak ada session ditemukan
    if (data.length === 0) {
      return res.status(404).json({ error: 'Session tidak ditemukan untuk user ini' });
    }

    // Hapus session
    const { error: delErr } = await supabase
      .from('session')
      .delete()
      .eq('sid', phone);

    if (delErr) {
      return res.status(500).json({ error: delErr.message });
    }

    res.json({ message: 'Logout berhasil, session dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
