import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from '../utils/supabaseClient.js';
import { checkUserLogin } from '../utils/authHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load rules dari JSON
const rulesPath = path.join(__dirname, '../utils/list_pertanyaan.json');
const rulesData = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));

// Fungsi untuk menghitung similarity antara text dengan keywords
const calculateSimilarity = (userInput, keywords) => {
  const input = userInput.toLowerCase();
  let matchCount = 0;

  keywords.forEach((keyword) => {
    if (input.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  });

  return matchCount > 0 ? matchCount / keywords.length : 0;
};

// Fungsi untuk menemukan response yang paling relevan
const findBestResponse = (userMessage) => {
  let bestMatch = null;
  let highestScore = 0;

  rulesData.rules.forEach((rule) => {
    const score = calculateSimilarity(userMessage, rule.keywords);

    if (score > highestScore) {
      highestScore = score;
      bestMatch = rule;
    }
  });

  // Return response jika ada match, jika tidak return fallback
  return highestScore > 0 ? bestMatch.response : rulesData.fallback;
};

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
      return res.status(401).json({
        success: false,
        error: 'User ID wajib dikirim (Login required)'
      });
    }

    const isLoggedIn = await checkUserLogin(user_id);
    if (!isLoggedIn) {
      return res.status(403).json({
        success: false,
        error: 'User tidak valid atau session expired'
      });
    }

    const response = findBestResponse(message);

    // Save transaction to database
    await supabase.from('interaction_log').insert([{
      user_id: user_id,
      message: message,
      response: response || 'No response', // Fallback just in case
      tanggal_interaksi: new Date()
    }]);

    return res.status(200).json({
      success: true,
      bot_name: rulesData.bot_name,
      user_message: message,
      bot_response: response
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memproses pesan'
    });
  }
};

// Controller untuk get bot info
export const getBotInfo = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      bot_name: rulesData.bot_name,
      total_rules: rulesData.rules.length,
      features: ['Menjawab pertanyaan umum tentang perpustakaan', 'Respon otomatis 24/7']
    });
  } catch (error) {
    console.error('Error in getBotInfo:', error);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil informasi bot'
    });
  }
};
