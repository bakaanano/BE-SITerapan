import express from 'express';
import { getAllBooks } from '../controller/catalog.controller.js'; // Perhatikan path ke controller

const router = express.Router();

// Route untuk mendapatkan semua buku
router.get('/', getAllBooks);

export default router;