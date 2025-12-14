import express from 'express';
import { sendMessage, getBotInfo } from '../controller/chatbot.controller.js';

const router = express.Router();

// POST endpoint untuk mengirim pesan ke chatbot
router.post('/send', sendMessage);

// GET endpoint untuk mendapatkan informasi bot
router.get('/info', getBotInfo);

export default router;
