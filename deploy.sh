#!/bin/bash
# macOS Cloud Native Gateway - One-Click GitHub Pages Deploy
# Zero cost, zero configuration

echo "🌍 Cloud Native Gateway - macOS Deploy"
echo "======================================"

# Check if git is installed (macOS has it by default)
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Install Xcode Command Line Tools:"
    echo "xcode-select --install"
    exit 1
fi

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Create dist folder for deployment
echo "📁 Preparing deployment files..."
mkdir -p dist
cp index.html styles.css app.js dist/

# Create README
cat > dist/README.md << EOF
# Cloud Native Gateway

Deployed from macOS. This is a static web application that converts GIS files to cloud-native formats.

**URL:** https://\$USERNAME.github.io/cloud-native-gateway
EOF

# Check if remote exists
if ! git remote | grep -q origin; then
    echo "🔗 GitHub remote not found."
    echo ""
    echo "Please create a new repository at: https://github.com/new"
    echo "Repository name: cloud-native-gateway"
    echo ""
    read -p "Enter your GitHub username: " GH_USERNAME
    git remote add origin "https://github.com/$GH_USERNAME/cloud-native-gateway.git"
fi

# Commit and push
git add .
git commit -m "macOS deployment $(date)"
git branch -M main
git push -u origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Go to https://github.com/$(git config --get remote.origin.url | sed 's/.*:\(.*\).git/\1/')/settings/pages"
echo "2. Select 'main' branch and '/docs' folder"
echo "3. Click Save"
echo ""
echo "🌍 Your site will be live at:"
echo "https://$(git config --get remote.origin.url | sed 's/.*:\(.*\).git/\1/' | sed 's/\/.*//').github.io/cloud-native-gateway"