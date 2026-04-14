# 🚀 Deployment Guide

This guide explains how to deploy the Emotion-Adaptive Learning System using the recently added configuration files.

## 1. Frontend (Vercel)
The `FrontEnd` directory is configured for Vercel.

**Steps:**
1. Log in to [Vercel](https://vercel.com).
2. Create a **New Project**.
3. Import this repository.
4. Set the **Root Directory** to `FrontEnd`.
5. Add **Environment Variables**:
   - `VITE_API_URL`: Your deployed Backend URL (e.g., `https://emotion-adaptive-api.onrender.com`).
6. Click **Deploy**.

> [!NOTE]
> The `vercel.json` file in `FrontEnd/` handles SPA routing, ensuring that refreshing the page doesn't result in a 404 error.

---

## 2. Backend (Render)
The `backend` directory is configured for Render using both a `Procfile` and a `render.yaml` Blueprint.

### Option A: Manual Setup (Easiest)
1. Log in to [Render](https://render.com).
2. Create a **New Web Service**.
3. Set the **Build Command**: `pip install -r backend/requirements.txt`.
4. Set the **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Add **Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `FRONTEND_URL`: Your Vercel URL (for CORS).

### Option B: Blueprint Setup (Render YAML)
1. In Render, go to **Blueprints**.
2. Connect your repository.
3. Render will automatically detect the `render.yaml` file in the root and configure both services.

---

## 🛠️ Summary of Created Documents
- `FrontEnd/vercel.json`: Routing config for Vercel.
- `backend/Procfile`: Deployment instruction for Render/Heroku.
- `render.yaml`: (Root) Blueprint for infrastructure-as-code deployment.
