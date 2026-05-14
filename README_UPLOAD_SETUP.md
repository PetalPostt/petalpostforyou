# PetalPost - Content Upload System

## ✨ What's New

You can now upload and manage content directly on your website without redeploying!

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will run on `http://localhost:3000`

### 3. Access Admin Panel
Go to `http://localhost:3000/admin.html` to:
- ✅ Upload images and files
- ✅ Add/manage products
- ✅ View all uploaded files

## 📁 Features

### File Upload
- Upload images (JPG, PNG, GIF, WebP) and PDFs
- Drag & drop support
- Files stored in `/uploads` folder
- Get direct URLs for embedding

### Product Management
- Add products with name, price, category, image, description
- All products saved in `products.json`
- Delete products anytime
- Products persist between restarts

### File Management
- View all uploaded files
- Copy URLs easily
- File size information

## 📍 File Structure

```
/uploads/          - Uploaded files
products.json      - Product database
admin.html         - Admin dashboard
server.js          - Backend server
package.json       - Dependencies
```

## 🔗 API Endpoints

```
POST   /api/upload           - Upload a file
GET    /api/products         - Get all products
POST   /api/products         - Add a product
DELETE /api/products/:id     - Delete a product
GET    /api/files            - List all files
```

## 💾 Deployment

### For Vercel:
Add `vercel.json`:
```json
{
  "buildCommand": "npm install",
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/server.js" }
  ]
}
```

### For Netlify:
Add `netlify.toml`:
```toml
[build]
  command = "npm install"
  functions = "server.js"
  publish = "."
```

### For Traditional Hosting:
Use Node.js hosting (Heroku, Railway, Render, etc.)

## 📝 Notes

- Max file size: 10MB
- Allowed file types: JPG, PNG, GIF, WebP, PDF
- Products and uploads persist across server restarts
- Keep `/uploads` folder backed up regularly

## 🆘 Troubleshooting

**"Cannot find module 'express'"**
- Run: `npm install`

**Port already in use**
- Run on different port: `PORT=3001 npm start`

**Files not uploading**
- Check file size (max 10MB)
- Check file type (only images & PDF)
- Check server logs for errors

## 🎉 That's it!

You're all set. Start uploading content and manage your PetalPost website directly!
