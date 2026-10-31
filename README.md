# Digital Dark Spot

### AI-Assisted Information Gap Detection Platform

Digital Dark Spot is an AI-powered research intelligence platform that compares multiple information sources to identify potential information gaps, conflicting claims, outdated information signals, and unanswered research questions.

## Features

- Research question-based analysis
- Multiple source comparison
- URL-based webpage content extraction
- AI-powered analysis using Google Gemini
- Evidence quotations and source references
- Potential information gap detection
- Potential contradiction identification
- Potentially outdated source detection
- Unanswered research questions
- Prioritized verification checklist
- Dedicated Evidence Review and Full Report pages

## Technology Stack

- Frontend: React, Vite, CSS
- Backend: Python, FastAPI
- AI: Google Gemini API
- Web extraction: Requests, BeautifulSoup
- Communication: REST API

## Project Structure

```text
digital-dark-spot/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── .gitignore
└── README.md
```

## Running Locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Configure your Gemini API key in `backend/.env`, then run:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Transparency

DarkSpot reports potential signals, not guaranteed facts. Users should independently verify findings against original sources. Web extraction is limited to accessible HTML pages.

## Future Scope

- PDF and document extraction
- Duplicate-source detection
- Persistent verification tracking
- Research report export
- Advanced source credibility assessment

**Developed for Shinchan Online Hackathon 2026.**