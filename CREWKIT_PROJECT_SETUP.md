# CrewKit Unified Deployment Setup ✅

## Project Configuration

Your repo is now linked to: **https://vercel.com/gabe-cabreras-projects/crewkit**

## What's Configured

✅ **Project Linked**: `.vercel/project.json` points to `crewkit` project  
✅ **Unified Deployment**: Frontend + Backend on same URL  
✅ **Environment Variables**: Already set (DATABASE_URL, JWT_SECRET, etc.)

## Deployment

### Deploy to Production

```bash
vercel --prod
```

Or push to your main branch (if GitHub integration is set up).

### What Gets Deployed

1. **Frontend** → Served from `web/dist/`
2. **Backend API** → Serverless function at `/api/index.js`
3. **Routes**:
   - `/api/*` → Backend serverless function
   - `/*` → React frontend (SPA)

## URL Structure

Once deployed, everything will be at:
- **Production URL**: `https://crewkit.vercel.app` (or your custom domain)
- **Frontend**: `https://crewkit.vercel.app/`
- **Backend API**: `https://crewkit.vercel.app/api/*`

## Environment Variables

You already have these set:
- ✅ `DATABASE_URL`
- ✅ `JWT_SECRET`
- ✅ `NODE_ENV`

**Note**: Since we're using same-origin (frontend and backend on same URL), you don't need:
- ❌ `CORS_ORIGIN` (can be removed, but harmless if left)
- ❌ `VITE_API_URL` (frontend uses relative `/api` URL)
- ❌ `VITE_SOCKET_URL` (frontend uses same origin)

## Next Steps

1. **Deploy**: Run `vercel --prod` or push to GitHub
2. **Test**: Visit your deployment URL and test login
3. **Monitor**: Check Vercel dashboard for any build/deployment errors

## Benefits of This Setup

✅ **No CORS issues** - Same origin  
✅ **Simpler configuration** - No API URL env vars needed  
✅ **Single deployment** - One command deploys everything  
✅ **Easier debugging** - Everything on one domain



