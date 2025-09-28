# Development & Deployment Guide

## Prerequisites
1. GitHub repository with your code
2. MongoDB Atlas account (for production)
3. Vercel account (for frontend)
4. Render account (for backend)

## 🚀 LOCAL DEVELOPMENT SETUP

### Step 1: Install Dependencies
```bash
# Install all dependencies
npm run install-all
```

### Step 2: Set up Environment Variables

#### For Server (Backend):
1. Copy `env.example` content to `server/.env`
2. Update the values:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/govt-scheme-qna
   JWT_SECRET=your-secret-key
   GOOGLE_API_KEY=your-google-api-key
   CORS_ORIGIN=http://localhost:3000
   ```

#### For Client (Frontend):
1. Copy `env.example` content to `client/.env.local`
2. Update the values:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

### Step 3: Start Development Servers
```bash
# Start both frontend and backend
npm run dev

# OR start them separately:
npm run server  # Backend on http://localhost:5000
npm run client  # Frontend on http://localhost:3000
```

### Step 4: Test Locally
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/api/health

---

## 🌐 PRODUCTION DEPLOYMENT

## Step 1: Set up MongoDB Atlas
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free account
3. Create new project: `Govt Scheme QNA`
4. Build a cluster (M0 Sandbox - FREE)
5. Create database user
6. Network Access: Add IP `0.0.0.0/0` (allow from anywhere)
7. Get connection string

## Step 2: Deploy Backend to Render
1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `govt-scheme-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: `Free`
6. Add Environment Variables:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `MONGODB_URI=your_mongodb_connection_string`
   - `JWT_SECRET=your_jwt_secret`
   - `GOOGLE_API_KEY=your_google_api_key`
   - `CORS_ORIGIN=https://your-frontend-url.vercel.app`
7. Click "Create Web Service"
8. Wait for deployment
9. Copy your backend URL

## Step 3: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
6. Add Environment Variables:
   - `REACT_APP_API_URL=https://your-backend-url.onrender.com/api`
7. Click "Deploy"
8. Wait for deployment
9. Copy your frontend URL

## Step 4: Update CORS Origin
1. Go back to Render dashboard
2. Update `CORS_ORIGIN` environment variable with your Vercel URL
3. Redeploy backend

## Step 5: Test Your Deployment
1. Visit your Vercel frontend URL
2. Test all functionality
3. Check backend logs in Render if issues occur

## Environment Variables Summary

### Backend (Render)
- `NODE_ENV=production`
- `PORT=10000`
- `MONGODB_URI=mongodb+srv://...`
- `JWT_SECRET=your-secret-key`
- `GOOGLE_API_KEY=your-google-key`
- `CORS_ORIGIN=https://your-app.vercel.app`

### Frontend (Vercel)
- `REACT_APP_API_URL=https://your-backend.onrender.com/api`

## Important Notes
- Render free tier: Apps sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- Vercel: Unlimited deployments, instant updates
- MongoDB Atlas: 512MB free storage
- Keep all sensitive data in environment variables
