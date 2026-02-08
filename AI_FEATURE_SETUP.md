# 🤖 AI Assistant Feature - Quick Setup Guide

## What's New?
Added an AI-powered assistant that explains anomaly severity, risk factors, and provides recommendations using Featherless.ai's LLM API.

## Quick Start (3 Steps)

### Step 1: Get Your Free API Key
1. Go to **https://featherless.ai/**
2. Click "Sign Up" (no credit card required)
3. Copy your API key from the dashboard

### Step 2: Configure the App
```bash
cd viewer/src
cp config.example.js config.js
```

Then edit `config.js` and replace `YOUR_API_KEY_HERE` with your actual key:
```javascript
export const FEATHERLESS_API_KEY = 'fl-xxxxxxxxxxxxx';
```

### Step 3: Run the App
```bash
cd viewer
npm run dev
```

Open http://localhost:5173/ and you're ready!

## How to Use

1. **Click an anomaly** in the 3D view
2. **Scroll down** to the "AI Assistant" section
3. **Click a quick question** or type your own:
   - 📊 Explain Severity
   - ⚠️ Risk Factors
   - 💡 Recommendations
   - 🔄 Compare Runs

## Example Questions

- "Why is this anomaly critical?"
- "What are the main risk factors?"
- "Should this be repaired immediately?"
- "How does the growth rate compare to industry standards?"
- "What inspection frequency do you recommend?"

## Features

✅ **Context-Aware**: AI knows all anomaly details (depth, growth, location, etc.)
✅ **Pre-built Prompts**: Quick questions for common scenarios
✅ **Custom Questions**: Ask anything about the selected anomaly
✅ **Technical Responses**: Expert-level pipeline integrity analysis
✅ **Fast**: Responses in 2-3 seconds

## What the AI Knows

When you select an anomaly, the AI has access to:
- Location (distance, joint number, orientation)
- Measurements (2015 depth, 2022 depth, growth rate)
- Severity score breakdown (all 4 factors)
- Validation results (spatial matching confidence)
- Time to failure estimates
- Scoring methodology

## Cost

**Free Tier**: Generous limits for testing and small projects
**Paid**: Very affordable (~$0.001 per request)

Check https://featherless.ai/pricing for details.

## Troubleshooting

### "Please configure your API key"
→ You need to set up `viewer/src/config.js` (see Step 2 above)

### "Please select an anomaly first"
→ Click on an anomaly in the 3D view before asking questions

### "API request failed"
→ Check your API key is valid and you have internet connection

## Security

- ✅ API key stored locally (not in git)
- ✅ Only anomaly data sent to API
- ✅ No personal information transmitted
- ✅ `config.js` is in `.gitignore`

## Next Steps

Want to enhance the AI feature? Ideas:
- Add conversation history
- Export chat transcripts
- Compare multiple anomalies
- Predictive maintenance scheduling
- Voice input/output

See `viewer/AI_ASSISTANT_README.md` for full documentation.
