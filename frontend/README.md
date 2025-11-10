# SYNTEST Frontend (React)

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Install Flask Backend Dependencies

```bash
cd ../backend  # Go to backend directory
pip install -r requirements.txt
```

### 3. Run the Application

You need to run both the Flask backend and React frontend:

**Terminal 1 - Flask Backend:**

```bash
cd backend
python app.py
```

The Flask server will run on `http://localhost:5000`

**Terminal 2 - React Frontend:**

```bash
cd frontend
npm run dev
```

The React app will run on `http://localhost:5173`

### 4. Test the Application

1. Open your browser and go to `http://localhost:5173`
2. You should see the landing page
3. Try signing up for a new account
4. Try logging in
5. Navigate to the dashboard

## Current Status

✅ Basic React setup with Vite
✅ Routing configured
✅ Authentication API endpoints added to Flask
✅ CORS configured for React dev server
✅ Basic pages created (Landing, Login, Signup)
⏳ Dashboard pages (placeholder)
⏳ Screening flow (placeholder)
⏳ Test pages (placeholder)

## Next Steps

- Complete dashboard implementations
- Migrate screening flow
- Migrate color tests
- Migrate speed congruency test
- Add error handling and loading states
- Style improvements
