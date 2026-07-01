# 🛡️ TrustGuard AI: Industrial Fake Review Intelligence Platform

**TrustGuard AI** is a cutting-edge, 360° ecosystem designed to detect and mitigate **Opinion Manipulation, Review Bombing, and Reputation Hijacking** on global e-commerce platforms. 

Built as an industrial-grade "Final Project", it combines deep-learning NLP, behavioral forensics, and real-time browser-level protection to ensure consumer trust in the digital marketplace.

---

## 🚀 Key Modules & Features

### 1. 🕵️ TrustBuy Analyzer (Consumer Portal)
A dedicated interface for shoppers to paste Amazon or Flipkart URLs. It provides:
- **Instant Trust Score**: A real-time probability of review authenticity.
- **Price Integrity History**: Detects fake sales and price-gouging patterns.
- **Verdict Cards**: Clear "Buy" or "Avoid" recommendations powered by NLP.

### 2. 🛰️ Mission Control (Admin Suite)
A high-performance command center for platform administrators:
- **Live Intelligence Feed**: A WebSocket-powered stream of real-time bot interceptions across the globe.
- **ML Performance Matrix**: Live tracking of model Accuracy, Precision, and F1-scores.
- **One-Click Retrain**: Automated pipeline for model optimization using GridSearchCV.

### 3. 📐 Network Forensics (Social Graph)
A visual force-directed bipartite graph that uncovers **Review Syndicates**:
- **Bipartite Mapping**: Connects suspicious Author IDs to Seller Nodes.
- **Infrastructure Analysis**: Detects coordinated "Bombing" attacks from competitor networks.
- **Node Inspector**: Slide-out panel for deep-dive behavioral forensics.

### 4. 🧭 Reputation Management
Strategic brand health tracking module:
- **12-Month Trust Trends**: Tracks brand sentiment and trust trajectory over time.
- **Linguistic Mimicry Detection**: Identifies bot-generated patterns that attempt to copy human speech.

### 5. 🧩 TrustGuard Chrome Extension
A native browser tool that brings protection directly to the merchant:
- **DOM Injection Scanning**: Bypasses e-commerce anti-bot CAPTCHAs by reading reviews locally.
- **Live Risk Badges**: Instantly marks pages as "High Risk" or "Safe" via a popup UI.

---

## 🏗️ Technical Architecture

### **Backend Stack**
- **Engine**: FastAPI (Python)
- **ML Intelligence**: Scikit-Learn (TF-IDF + Logistic Regression)
- **Data Scraping**: Cloudscraper + Browser DOM Injection
- **Real-Time**: WebSockets (Live Intelligence Feed)

### **Frontend Stack**
- **Core**: React 18 + Vite
- **Visuals**: Recharts (Analytics) + React Force Graph (Forensics)
- **Design**: Modern Glassmorphism (Vanilla CSS 3)
- **Icons**: Lucide React

---

## 🛠️ Setup & Installation

### Prerequisite: Python 3.9+ & Node 18+

1. **Clone & Install Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python train_model.py  # Initialize the ML Brain
   python -m backend.api.main
   ```

2. **Launch Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Install Chrome Extension**:
   - Go to `chrome://extensions/`
   - Enable **Developer Mode**.
   - Click **Load Unpacked** and select the `extension/` folder.

---

## ⚖️ License
Research Project - Internal Use Only.
Developed for Final Project submission 2026.
