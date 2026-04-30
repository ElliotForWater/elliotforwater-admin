# Deployment Guide - Netlify Hosting

This document explains how deployment works for the Elliot for Water Admin project, which is already configured to use Netlify.

## 🎯 How Deployment Works

**Current Setup**: The project is hosted and deployed via Netlify.

**How it works**:
```
You push to GitHub on the `main` branch → Netlify detects changes → Builds and deploys → Website updates automatically
```

## 🌐 Netlify Hosting

### **What is Netlify?**
- **Web hosting service** that serves your live website
- **Automatic deployments** triggered by GitHub pushes
- **Build optimization** and global CDN for fast loading

### **Deployment Trigger**
- **Main branch**: Any push to `main` branch automatically deploys to production
- **Build process**: Netlify runs `npm run build` and deploys the `dist` folder


## ⚙️ Environment Variables

### **Important: Netlify Environment Variables**
Environment variables are configured in Netlify dashboard, not in your local `.env` file.

### **When to Update Netlify Variables**
You need to update Netlify environment variables when any of the value you have in `.env` change.

**How to Update:**
1. Go to Netlify dashboard → Site settings → Environment variables
2. Update the changed variables
3. Trigger a new deploy (or push to main)

### **Local vs. Production Variables**
- **Local `.env`**: For development on `http://localhost:8080`
- **Netlify variables**: For production on your live site
- **Keep them in sync** when values change

## Common Deployment Issues

### **Build Failures**
- **Check build logs** in Netlify dashboard for error details
- **Verify environment variables** are correctly set in Netlify
- **Ensure dependencies** are properly listed in `package.json`

### **Environment Variable Issues**
- **Supabase connection problems**? Check Netlify environment variables
- **OAuth not working**? Verify redirect URLs in Supabase include your Netlify URL
- **API errors**? Ensure all required variables are set correctly

### **How to Troubleshoot**
1. **Check Netlify build logs** for specific error messages
2. **Ask your AI agent**: "The deployment failed, can you help me check the build log?"
3. **Verify environment variables** match between local and Netlify
4. **Test locally** with `npm run build` to catch build errors before pushing

## 📊 Monitoring Your Deployments

### **Deployment Status**
- **Green checkmark**: Deployed successfully
- **Red X**: Failed deployment
- **Yellow circle**: In progress

### **Build Logs**
1. In Netlify dashboard, click on your site
2. Go to **Deploys** tab
3. Click on any deployment to see detailed logs
4. Look for red error messages

### **Analytics**
Netlify provides basic analytics:
- Page views
- Bandwidth usage
- Build times
- Error rates

## 🎯 Best Practices

### **Before Pushing to Main**
1. **Test locally** - Make sure everything works
2. **Run `npm run build`** locally to catch build errors
3. **Check environment variables** match between local and Netlify
4. **Review your changes** with `git status`

### **After Deployment**
1. **Test the live site** thoroughly
2. **Check all functionality** works
3. **Test login/logout** flow
4. **Verify forms and data saving**

### **Rollback if Needed**
If something goes wrong:
1. **Go to Netlify dashboard**
2. **Deploys tab**
3. **Find the last good deployment**
4. **Click "Publish deploy"** to rollback

## 🤖 Working with AI on Deployment

### **Common AI Requests**
- "The deployment failed, can you check the build log?"
- "Can you help me set up the environment variables?"
- "The site deployed but login doesn't work"
- "Can you rollback to the previous version?"

### **What Your AI Can Help With**
- Reading build logs and identifying issues
- Setting up environment variables correctly
- Troubleshooting OAuth configuration
- Fixing build errors
- Rolling back deployments

### **Example Conversations**
> You: "My deployment failed, can you help?"
> AI: "I'll check the build log and identify the issue. Let me look at the error messages and suggest fixes."

> You: "The site deployed but I can't log in"
> AI: "Let me check your OAuth configuration and environment variables. This is usually a redirect URL issue."

---
