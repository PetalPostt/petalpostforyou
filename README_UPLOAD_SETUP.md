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
- Upload images, videos, and PDFs
- Drag & drop support
- Local file upload fallback in `/uploads`
- Optional AWS S3 storage when `S3_BUCKET` and AWS credentials are configured
- Get direct URLs for embedding

### Product Management
- Add products with name, price, category, image, description
- Products are stored persistently in SQLite (`data/products.db`)
- Delete or edit products anytime
- Shared between devices and deploys when hosted with persistent storage

### File Management
- View all uploaded files
- Copy URLs easily
- File size information

## 📍 File Structure

```
/uploads/          - Local uploaded files (fallback)
/data/products.db  - SQLite product database
admin.html         - Admin dashboard
server.js          - Backend server
package.json       - Dependencies
.env.example       - Sample environment config
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

### Best option: Render
Render is the most convenient host for this Node.js app because it supports a web service with `server.js`, serves static files, uses persistent disk, and provides automatic GitHub deploys.

1. Push your repo to GitHub.
2. Create a new Web Service on Render.
3. Connect the repository `PetalPostt/petalpostforyou`.
4. Render will use `render.yaml` and deploy from branch `main`.

If you want persistent file storage, configure AWS S3 credentials in Render environment settings and add them to your service:
- `S3_BUCKET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Render will use:
- build command: `npm install`
- start command: `npm start`
- automatic deploys on GitHub pushes

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
