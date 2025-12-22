import supabase from './supabaseClient.js';

export const checkUserLogin = async (user_id) => {
    if (!user_id) return false;

    // Cek apakah ada session untuk user ini
    // Kita asumsikan 'sess' kolom di tabel session menyimpan JSON yang berisi user_id
    // Atau kita bisa cek session berdasarkan user_id jika ada relasi yang jelas.
    // Dari auth.controller.js, session disimpan dengan sid = user.phone dan sess = object user.

    // Karena struktur session agak unik (sid=phone), kita perlu strategi.
    // Jika frontend mengirim user_id, kita perlu memastikan user_id itu punya session aktif.
    // Tapi session tabel pake sid=phone.

    // Alternatif: Kita cek apakah user_id ini ada di dalam kolom 'sess' di tabel session.
    // Kolom 'sess' adalah JSONB (biasanya).

    // Note: auth.controller.js: insert([{ sid: user.phone, sess: ssn, expire: expireTime }]); ssn = { user_id: ... }

    try {
        const { data, error } = await supabase
            .from('session')
            .select('*')
            // Filter row dimana field 'sess' ->> 'user_id' sama dengan user_id yang dikirim
            .filter('sess->>user_id', 'eq', user_id)
            .gt('expire', new Date().toISOString()); // Pastikan belum expired

        if (error) {
            console.error('Error checking session:', error);
            return false;
        }

        return data && data.length > 0;
    } catch (err) {
        console.error('Unexpected error checking session:', err);
        return false;
    }
};

export const getUserRole = async (user_id) => {
    if (!user_id) return null;

    try {
        const { data, error } = await supabase
            .from('session')
            .select('sess')
            .filter('sess->>user_id', 'eq', user_id)
            .gt('expire', new Date().toISOString())
            .single();

        if (error || !data) {
            return null;
        }

        return data.sess.role || 'user';
    } catch (err) {
        console.error('Error getting user role:', err);
        return null;
    }
};
