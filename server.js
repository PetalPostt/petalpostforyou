require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
const useS3 = process.env.S3_BUCKET && process.env.AWS_REGION;
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'products.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    desc TEXT NOT NULL,
    emoji TEXT,
    price TEXT NOT NULL,
    color TEXT,
    badge TEXT,
    media TEXT,
    mediaType TEXT,
    createdAt TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    occasion TEXT,
    budget TEXT,
    message TEXT,
    createdAt TEXT NOT NULL
  )`);
});

let s3Client;
let s3Bucket;
let s3Region;
if (useS3) {
  s3Bucket = process.env.S3_BUCKET;
  s3Region = process.env.AWS_REGION;
  s3Client = new S3Client({ region: s3Region });
}

const allowedTypes = /jpeg|jpg|png|gif|pdf|webp|mp4|mov/;
const storage = useS3 ? multer.memoryStorage() : multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image, video, and PDF files are allowed'));
  }
});

if (!useS3 && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let openaiClient;
if (hasOpenAI) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
if (!useS3) {
  app.use('/uploads', express.static(uploadsDir));
}

function s3Url(key) {
  return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${encodeURIComponent(key)}`;
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (useS3) {
    const key = `${Date.now()}-${req.file.originalname}`;
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read'
      }));
      return res.json({
        success: true,
        filename: key,
        originalName: req.file.originalname,
        url: s3Url(key),
        size: req.file.size
      });
    } catch (error) {
      console.error('S3 upload error:', error);
      return res.status(500).json({ error: 'Failed to upload to S3' });
    }
  }

  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size
  });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!hasOpenAI || !openaiClient) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a friendly customer support assistant for PetalPost, a small Indian virtual gift studio. Keep answers short, helpful, and suggest Instagram DM for orders when appropriate.'
        },
        { role: 'user', content: message.trim() }
      ],
      max_tokens: 220,
      temperature: 0.7
    });

    const reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error('Empty response from OpenAI');
    }
    return res.json({ success: true, reply });
  } catch (error) {
    console.error('OpenAI chat error:', error);
    return res.status(500).json({ error: 'Chat service unavailable' });
  }
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      console.error('DB read error:', err);
      return res.status(500).json([]);
    }
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { name, desc, emoji, price, color, badge, media, mediaType } = req.body;
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`INSERT INTO products (name, desc, emoji, price, color, badge, media, mediaType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(name, desc, emoji, price, color, badge, media, mediaType, createdAt, function(err) {
    if (err) {
      console.error('DB insert error:', err);
      return res.status(500).json({ error: 'Could not save product' });
    }
    const product = { id: this.lastID, name, desc, emoji, price, color, badge, media, mediaType, createdAt };
    res.json({ success: true, product });
  });
  stmt.finalize();
});

app.put('/api/products/:id', (req, res) => {
  const { name, desc, emoji, price, color, badge, media, mediaType } = req.body;
  const stmt = db.prepare(`UPDATE products SET name = ?, desc = ?, emoji = ?, price = ?, color = ?, badge = ?, media = ?, mediaType = ? WHERE id = ?`);
  stmt.run(name, desc, emoji, price, color, badge, media, mediaType, parseInt(req.params.id, 10), function(err) {
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'Could not update product' });
    }
    db.all('SELECT * FROM products ORDER BY createdAt DESC', (readErr, rows) => {
      if (readErr) {
        console.error('DB read error:', readErr);
        return res.status(500).json({ error: 'Could not read products' });
      }
      res.json({ success: true, products: rows });
    });
  });
  stmt.finalize();
});

app.delete('/api/products/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM products WHERE id = ?');
  stmt.run(parseInt(req.params.id, 10), function(err) {
    if (err) {
      console.error('DB delete error:', err);
      return res.status(500).json({ error: 'Could not delete product' });
    }
    res.json({ success: true });
  });
  stmt.finalize();
});

app.post('/api/contacts', (req, res) => {
  const { name, email, phone, occasion, budget, message } = req.body;
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`INSERT INTO contacts (name, email, phone, occasion, budget, message, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(name || null, email || null, phone || null, occasion || null, budget || null, message || null, createdAt, function(err) {
    if (err) {
      console.error('DB contact insert error:', err);
      return res.status(500).json({ error: 'Could not save contact info' });
    }
    res.json({ success: true, contactId: this.lastID });
  });
  stmt.finalize();
});

app.get('/api/files', async (req, res) => {
  if (useS3) {
    try {
      const response = await s3Client.send(new ListObjectsV2Command({ Bucket: s3Bucket }));
      const fileList = (response.Contents || []).map(item => ({
        name: item.Key,
        url: s3Url(item.Key),
        size: item.Size
      }));
      return res.json(fileList);
    } catch (error) {
      console.error('S3 list error:', error);
      return res.status(500).json({ error: 'Could not list S3 files' });
    }
  }

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Could not read files' });
    }
    const fileList = files.map(file => ({
      name: file,
      url: `/uploads/${file}`,
      size: fs.statSync(path.join(uploadsDir, file)).size
    }));
    res.json(fileList);
  });
});

app.listen(PORT, () => {
  console.log(`PetalPost server running on http://localhost:${PORT}`);
});
