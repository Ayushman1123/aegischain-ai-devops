# ✨ Welcome to Your Spark Template!
You've just launched your brand-new Spark Template Codespace — everything’s fired up and ready for you to explore, build, and create with Spark!

This template is your blank canvas. It comes with a minimal setup to help you get started quickly with Spark development.

🚀 What's Inside?
- A clean, minimal Spark environment
- Pre-configured for local development
- Ready to scale with your ideas
  
🧠 What Can You Do?

Right now, this is just a starting point — the perfect place to begin building and testing your Spark applications.

## Hugging Face Model Setup

This project now supports using a Hugging Face model for shipment risk analysis.

1. Add your key and model in `.env.local`:

```bash
VITE_HUGGING_FACE_API_KEY=hf_your_token_here
VITE_HUGGING_FACE_MODEL=mistralai/Mistral-7B-Instruct-v0.3
```

2. Start the app:

```bash
npm run dev
```

If `VITE_HUGGING_FACE_API_KEY` is set, the app uses Hugging Face via the router API.
If not set, it falls back to Spark LLM (`gpt-4o`).

## Name + Email Login + Backend Auth Setup

This project includes a backend session flow for normal login.
Users must enter name and email before the dashboard is shown.

1. Fill these values in `.env`:

	- `JWT_SECRET` (long random string)
	- Optional: `PORT` (default `8787`), `CORS_ORIGIN` (default `http://localhost:5173`)

2. Start backend in one terminal:

```bash
npm run dev:backend
```

3. Start frontend in another terminal:

```bash
npm run dev:frontend
```

4. Open the app and sign in with name and email. The main page appears after successful login.

🧹 Just Exploring?
No problem! If you were just checking things out and don’t need to keep this code:

- Simply delete your Spark.
- Everything will be cleaned up — no traces left behind.

📄 License For Spark Template Resources 

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
