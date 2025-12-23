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

    // Call Cerebras API
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "Anda adalah asisten virtual perpustakaan yang ramah dan membantu. Tugas Anda adalah menjawab pertanyaan user seputar buku, peminjaman, dan info perpustakaan." },
        { role: "user", content: message }
      ],
      model: "llama3.1-8b",
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
