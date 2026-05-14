const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Serve static files
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size
  });
});

// Get products list
app.get('/api/products', (req, res) => {
  const productsFile = path.join(__dirname, 'products.json');
  
  if (fs.existsSync(productsFile)) {
    const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    res.json(products);
  } else {
    res.json([]);
  }
});

// Save product
app.post('/api/products', express.json(), (req, res) => {
  const productsFile = path.join(__dirname, 'products.json');
  let products = [];
  
  if (fs.existsSync(productsFile)) {
    products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  }
  
  const newProduct = {
    id: Date.now(),
    name: req.body.name,
    desc: req.body.desc,
    emoji: req.body.emoji || '🎁',
    price: req.body.price,
    color: req.body.color || 'rose-bg',
    badge: req.body.badge || '',
    media: req.body.media || null,
    mediaType: req.body.mediaType || null,
    createdAt: new Date().toISOString()
  };
  
  products.push(newProduct);
  fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
  
  res.json({ success: true, product: newProduct });
});

// Update product
app.put('/api/products/:id', express.json(), (req, res) => {
  const productsFile = path.join(__dirname, 'products.json');
  if (!fs.existsSync(productsFile)) {
    return res.status(404).json({ error: 'No products found' });
  }

  let products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  const updated = products.map(product => {
    if (product.id === parseInt(req.params.id, 10)) {
      return {
        ...product,
        name: req.body.name,
        desc: req.body.desc,
        emoji: req.body.emoji || product.emoji || '🎁',
        price: req.body.price || product.price,
        color: req.body.color || product.color,
        badge: req.body.badge || product.badge,
        media: req.body.media !== undefined ? req.body.media : product.media,
        mediaType: req.body.mediaType !== undefined ? req.body.mediaType : product.mediaType
      };
    }
    return product;
  });

  products = updated;
  fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
  res.json({ success: true, products });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  const productsFile = path.join(__dirname, 'products.json');
  
  if (!fs.existsSync(productsFile)) {
    return res.status(404).json({ error: 'No products found' });
  }
  
  let products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  products = products.filter(p => p.id !== parseInt(req.params.id));
  
  fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
  res.json({ success: true });
});

// Get uploaded files list
app.get('/api/files', (req, res) => {
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
