# Tech Stack Overview

This document explains the technologies and libraries used in the Elliot for Water Admin project.

## 🏗️ What This Project Is

Elliot for Water Admin is a **web application** that lets companies manage their Elliot for Water settings. It's like a control panel where administrators can:
- Change company branding (logo, colors)
- Manage team members
- Configure notifications
- Set up default links for employees

## 🧩 Main Technologies

### **Vue.js 3** - The Building Framework
- **What it is**: Vue.js is like the foundation of our web application
- **Why we use it**: It makes building interactive user interfaces easier
- **What you should know**: When AI agents mention "Vue components", they're talking about building blocks like buttons, forms, and pages

### **JavaScript** - The Programming Language
- **What it is**: The language that makes the website interactive
- **Why we use it**: It's the standard language for web development
- **What you should know**: All the logic, buttons, and interactions are written in JavaScript

### **HTML & CSS** - The Structure and Style
- **HTML**: Like the skeleton of the web page - defines where things go
- **CSS**: Like the clothes and makeup - makes everything look good
- **What you should know**: These determine how the website looks and is organized

## 🎨 UI Libraries & Styling

### **Tailwind CSS** - Styling Made Easy
- **What it is**: A UI toolkit that helps make the website look professional
- **Why we use it**: Instead of writing custom CSS, we use pre-made classes
- **Example**: Instead of writing CSS for a blue button, we just add `class="bg-blue-500 text-white"`
- **How we use it**: Custom components like `.btn-primary` and `.field-input` are defined using Tailwind's `@apply` directive

## 🗄️ Database & Storage

### **Supabase** - Our Database Service
- **What it is**: A cloud service that stores all our data
- **What it stores**: Company information, user settings, notifications, team members
- **Why we use it**: It's like having a digital filing cabinet that's accessible from anywhere

### **Supabase Storage** - File Storage
- **What it is**: Where we upload and store files like company logos and background images
- **Why we use it**: Instead of storing files on our server, Supabase handles it for us
- **What you should know**: When companies upload logos, they go here

## 🔐 Authentication & Security

### **Google OAuth** - Login System
- **What it is**: Lets users sign in with their Google account
- **Why we use it**: No need to remember passwords - uses existing Google accounts
- **How it works**: Click "Sign in with Google" → Google confirms identity → User gets access

### **Row Level Security (RLS)** - Data Protection
- **What it is**: Rules that ensure users can only see their own company's data
- **Why it's important**: Prevents one company from accessing another company's information
- **What you should know**: This is a critical security feature

## 📦 Other Important Libraries

### **Vuex** - State Management
- **What it is**: Keeps track of what's happening in the app (user logged in, current page, etc.)
- **Why we use it**: Ensures all parts of the app know what's going on
- **Example**: When a user logs in, Vuex tells all components "this user is now logged in"

### **Vue Router** - Navigation
- **What it is**: Handles moving between different pages
- **Why we use it**: Makes the single-page app feel like multiple pages
- **What you should know**: This is why you can go from login to admin panel without page reload

### **Vuex Persistence** - Remembering Settings
- **What it is**: Saves user preferences in the browser
- **Why we use it**: When users refresh the page, they don't lose their place
- **What it stores**: Current page, some settings, but not sensitive data

## 🛠️ Development Tools

### **Node.js** - JavaScript Runtime
- **What it is**: Lets us run JavaScript on the computer (not just in browser)
- **Why we need it**: Required for building and testing the application
- **What you should know**: You'll need this installed to develop locally

### **npm** - Package Manager
- **What it is**: Tool that manages all the libraries and dependencies
- **Why we use it**: Automatically downloads and updates all the tools we need
- **What you should know**: When AI agents say "npm install", they're telling it to download required tools

### **Babel** - Code Translator
- **What it is**: Converts modern JavaScript to work in older browsers
- **Why we use it**: Ensures the app works for everyone, regardless of browser
- **What you should know**: This happens automatically during development

## 🌐 Deployment & Hosting

### **Netlify** - Web Hosting
- **What it is**: Service that hosts our website so anyone can access it
- **Why we use it**: Easy deployment, automatic updates, good performance
- **How it works**: When we push code to GitHub, Netlify automatically updates the live site

### **GitHub Pages** - Alternative Hosting
- **What it is**: GitHub's free hosting service
- **Why it's mentioned**: Originally used, but we're moving to Netlify
- **What you should know**: This is the old way - use Netlify for new deployments

## 📱 What This Means for AI Development

When your AI agent talks about these technologies, here's what it means:

- **"Vue component"** = A piece of the user interface (button, form, section)
- **"Supabase query"** = Getting or saving data from our database
- **"Tailwind classes"** = Styling instructions to make things look good
- **"State management"** = Keeping track of what's happening in the app
- **"Deployment"** = Making the website live for users to access
