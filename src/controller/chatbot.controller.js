import OpenAI from 'openai';
import supabase from '../utils/supabaseClient.js';
import { checkUserLogin } from '../utils/authHelper.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: "https://api.cerebras.ai/v1",
});

// Controller untuk chat
export const sendMessage = async (req, res) => {
  try {
    const { message, user_id } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Pesan tidak boleh kosong'
      });
    }

    if (!user_id) {
      // Optional: Allow chat without login if desired, but keeping restriction for now
      // return res.status(401).json({ success: false, error: 'Login required' });
    }

    // Check login if user_id provided
    if (user_id) {
      const isLoggedIn = await checkUserLogin(user_id);
      if (!isLoggedIn) {
        return res.status(403).json({
          success: false,
          error: 'User tidak valid atau session expired'
        });
      }
    }

    // Fetch books from database
    const { data: books, error: bookError } = await supabase
      .from('buku')
      .select('Judul, Penulis, Kategori, stok');

    // DEBUG: Log loaded books
    console.log("DEBUG: Books loaded from DB:", books ? books.length : 0);
    if (bookError) console.error("DEBUG: Error loading books:", bookError);

    let bookContext = "";
    if (books && books.length > 0) {
      bookContext = "Daftar buku yang tersedia di perpustakaan (LANINYA TIDAK ADA):\n" +
        books.map(b => `- ${b.Judul} oleh ${b.Penulis} (Kategori: ${b.Kategori}, Stok: ${b.stok})`).join('\n');
    } else {
      bookContext = "SAAT INI TIDAK ADA BUKU YANG TERSEDIA DI DATABASE.";
    }
    console.log("DEBUG: Book Context:", bookContext);

    const systemPrompt = `Anda adalah asisten virtual perpustakaan yang ramah dan membantu.
Tugas Anda adalah menjawab pertanyaan user seputar buku, peminjaman, dan info perpustakaan.

INFORMASI DATABASE BUKU:
${bookContext}

ATURAN SANGAT PENTING (HARUS DIKUTI):
1. Anda HANYA boleh memberikan informasi mengenai buku yang TERTULIS SECARA EKSPLISIT dalam daftar di atas.
2. JANGAN PERNAH mengarang, menebak, atau menyebutkan judul buku yang tidak ada dalam daftar tersebut, meskipun buku itu terkenal (seperti Harry Potter, Laskar Pelangi, buku paket, dll).
3. Jika user menanyakan buku yang TIDAK ada di daftar, Anda WAJIB menjawab: "Mohon maaf, buku tersebut saat ini tidak tersedia di perpustakaan kami."
4. Jangan menawarkan rekomendasi buku di luar daftar ini via pengetahuan umum Anda.`;

    // DEBUG: Log the system prompt
    console.log("DEBUG: System Prompt sent to LLM:\n", systemPrompt);

    // Call Cerebras API
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      model: "llama3.1-8b",
      temperature: 0.2 // Lower tone down creativity to reduce hallucinations
    });

    const botResponse = completion.choices[0].message.content;

    // Save transaction to database (Optional: make this async/fire-and-forget to speed up response)
    if (user_id) {
      await supabase.from('interaction_log').insert([{
        user_id: user_id,
        message: message,
        response: botResponse,
        tanggal_interaksi: new Date()
      }]);
    }

    return res.status(200).json({
      success: true,
      bot_name: "Library AI Assistant (Cerebras)",
      user_message: message,
      bot_response: botResponse
    });

  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memproses pesan: ' + error.message
    });
  }
};

// Controller untuk get bot info
export const getBotInfo = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      bot_name: "Library AI Assistant (Cerebras)",
      features: ['Powered by Cerebras Llama 3.1', 'Menjawab pertanyaan seputar perpustakaan', 'Respon natural dan sangat cepat']
    });
  } catch (error) {
    console.error('Error in getBotInfo:', error);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil informasi bot'
    });
  }
};
