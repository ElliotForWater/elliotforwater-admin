# Development Setup Guide

This guide helps you set up and run the Elliot for Water Admin project locally, whether you're a first-time user or returning to the project.

## 🚀 Quick Start for First-Time Users

### **What You'll Need**
1. **A code editor** (like VS Code - recommended but not required)
2. **An AI agent** (like Claude Code) to help with development
3. **Git** installed on your computer
4. **Node.js** installed on your computer

### **Step 1: Install Node.js**
Node.js is required to run the project locally. Some computer have it already installed. Ask your AI support to guide you through the installation process if needed.

**What is Node.js?**
- It's a program that lets your computer run JavaScript
- Think of it like installing Microsoft Word to open .doc files

### **Step 2: Get the Project Code**
You need to download the project from GitHub to your computer.

**Using Git**
1. Open your terminal/command prompt
2. type `git`. If the output is "git: command not found", you need to install Git first. Ask support to you AI on how to do it for your specific computer.
3. If you have git installed, navigate to where you want to save the project
4. Run: `git clone https://github.com/your-username/elliotforwater-admin.git`
5. Navigate into the project: `cd elliotforwater-admin`


### **Step 3: Install Dependencies**
The project needs some helper programs to work.

**What are dependencies?**
- Think of them like ingredients for a recipe
- The project needs these tools to function properly

**How to Install:**
1. Open your terminal/command prompt
2. Navigate to the project folder: `cd elliotforwater-admin`
3. Run: `npm install`
4. Wait for it to finish (this might take a few minutes)

### **Step 4: Set Up Environment Variables**
The project needs secret information to connect to the database.

**What are environment variables?**
- Secret settings like passwords and API keys
- They should never be shared or committed to GitHub

**How to Set Up:**
1. In the project folder, create a new file called `.env`
2. Copy the content from `.env.example`into the `.env` file.
3. Replace the placeholder values with your actual Supabase details
4. Save the file

**Important:** The `.env` file should never be uploaded to GitHub! It contains sensitive information.
If it gets committed by accident, revoke the keys in your Supabase dashboard and generate new ones.
This should not happen as we have a `.gitignore` file, which is a file where we specify files and folders that should be excluded from version control. The `.env` file is listed there.

### **Step 5: Run the Project**
Now you can start the development server.

**How to Run:**
1. In your terminal, make sure you're in the project folder
2. Run: `npm run serve`
3. Wait for it to start
4. Open your web browser and go to: `http://localhost:8080`

**Success!** You should see the Elliot for Water Admin interface.

## 🔄 Daily Workflow for Returning Users

### **Starting Work Each Day**
1. **Open your terminal/command prompt**
2. **Navigate to project folder**: `cd elliotforwater-admin`
3. **Get latest changes**: `git pull`
4. **Start the server**: `npm run serve`
5. **Open browser**: `http://localhost:8080`

### **Making Changes with AI**
1. **Tell your AI what you want to change**
2. **AI makes the changes to the code**
3. **Test the changes in your browser**
4. **When happy, ask AI to commit and push**

### **Stopping Work**
1. **Stop the server**: Press `Ctrl+C` in the terminal
2. **Commit and push changes** (ask AI to help)
3. **Close your terminal**

## 🧪 Testing Your Changes

### **What to Test**
- **Visual changes**: Does it look right?
- **Functionality**: Does the feature work as expected?
- **Responsive design**: Does it work on different screen sizes?
- **Error handling**: What happens when things go wrong?
- **Regression**: Is something working differently then before?

### **How to Test**
1. **Make your change**
2. **Refresh your browser** (or restart the server if needed)
3. **Try the feature**
4. **Test edge cases** (empty inputs, wrong data, etc.)
5. **If something's wrong, ask AI to fix it**
6. **Production readiness**: Use the production ready check list to see if is ready and safe to be deploy online.

## 🚨 Common Problems & Solutions

### **"Command not found" Errors**
**Problem**: Terminal says `npm: command not found` or `node: command not found`
**Solution**: Node.js isn't installed correctly
1. Reinstall Node.js from nodejs.org
2. Restart your computer
3. Try again

### **"Port already in use" Error**
**Problem**: Another program is using port 8080
**Solution**: Either:
1. Close other programs using port 8080, or
2. Use a different port: `npm run serve -- --port 8081`

### **"Dependencies not found" Errors**
**Problem**: Missing required packages
**Solution**: Run `npm install` again

### **Environment Variables Not Working**
**Problem**: Supabase connection errors
**Solution**: 
1. Check your `.env` file exists
2. Verify the values are correct
3. Make sure the `.env` file is in the project root folder

### **Changes Not Showing Up**
**Problem**: You made changes but don't see them
**Solution**: 
1. Try refreshing the browser with `Ctrl+F5` (hard refresh)
2. Check if the server needs to be restarted
3. Clear browser cache

## 🤖 Working with Your AI Agent

### **Best Practices**
1. **Be specific** about what you want to change
2. **Test changes** before committing
3. **Ask AI to explain** if you don't understand something
4. **Let AI handle Git commands** - you focus on what you want to accomplish

### **Example Requests**
- "Can you change the login button to blue?"
- "I want to add a new field for company phone number"
- "The notifications aren't working, can you fix it?"
- "Can you make the mobile layout better?"

### **Questions to Ask AI**
- "What did you change in this commit?"
- "Can you explain how this feature works?"
- "Is this change safe to deploy?"
- "What should I test to make sure this works?"

## 📋 Quick Reference Commands

### **Essential Commands**
```bash
npm install          # Install dependencies
npm run serve        # Start development server
git pull             # Get latest changes
git status           # See what changed
```

### **Useful Commands**
```bash
npm run build        # Build for production
npm run lint         # Check code quality
git log --oneline    # See recent commits
```

## 🎯 Success Tips

1. **Always pull before starting** work
2. **Test locally before pushing** to GitHub
3. **Make small, focused changes** rather than big ones
4. **Ask your AI to explain** anything that's unclear
5. **Keep your `.env` file secret** - never share it

---

