# Nepal Cricket Match Predictor 🏏

A real-time predictive analytics dashboard designed to forecast outcomes for Nepal's international cricket matches using Machine Learning.

## 🚀 Overview
This project combines sports analytics with modern web technologies to provide an interactive platform for cricket fans and analysts. It uses a historical dataset of T20I matches to train a classification model that predicts the probability of a win based on granular match metrics.

## 🛠️ Tech Stack
- **Frontend**: React.js, Tailwind CSS, Lucide React, Framer Motion
- **Backend**: FastAPI (Python)
- **Machine Learning**: Scikit-learn (Random Forest Classifier), Pandas, NumPy
- **Data**: Historical T20I and ODI match data for the Nepal National Team

## ✨ Key Features
- **Real-time Predictions**: Interactive UI to input match parameters and get instant win probabilities.
- **Data Visualization**: Statistical breakdown of team performance and player impact.
- **ML Driven**: Leveraging a Random Forest model trained on historical match conditions and results.
- **Mobile Responsive**: Fully optimized for viewing on all device sizes.

## 📦 Installation & Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---
*Developed by Darshan Karna*
