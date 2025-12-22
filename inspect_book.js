import supabase from './src/utils/supabaseClient.js';

async function inspect() {
    const { data, error } = await supabase.from('buku').select('*').limit(1);
    if (error) console.error(error);
    else console.log('Book keys:', Object.keys(data[0] || {}));
}

inspect();
