# 🚀 AI Auto-Explain - Quick Reference

## One-Time Setup (2 minutes)

```bash
# 1. Get API key from https://featherless.ai/ (free)

# 2. Configure
cd viewer/src
cp config.example.js config.js
# Edit config.js, add your API key

# 3. Run
cd ..
npm run dev
```

## How to Use

1. **Click anomaly** in 3D view
2. **Watch it glow** indigo
3. **Read AI explanation** (auto-appears in 2-3 seconds)

## What AI Explains

| Section | What You Get |
|---------|-------------|
| 🎯 Classification | Why Critical/High/Moderate/Low |
| 📊 Severity | Score breakdown (4 factors) |
| ✅ Confidence | Match reliability (%) |
| 📍 Nearby | Anomalies between joints |
| ⚡ Action | YES/NO immediate action |
| 💡 Recommendations | Specific next steps |

## Example Output

```
CRITICAL (72/100) - Immediate action required

• 44% depth = 35 pts
• 2.14%/yr growth = 21 pts  
• 15% total growth = 12 pts
• 17 years to failure = 4 pts

Confidence: 87% (validated match)
Nearby: 2x Metal Loss in joint range
Action: YES - inspect within 6 months
```

## Quick Questions (Optional)

After auto-explanation, click:
- 📊 Explain Severity
- ⚠️ Risk Factors
- 💡 Recommendations
- 🔄 Compare Runs

Or type custom questions.

## Cost

- Free tier: Generous limits
- Paid: ~$0.001 per analysis
- 1000 analyses = ~$1

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Configure API key" | Add key to `config.js` |
| "Select anomaly first" | Click anomaly in 3D view |
| "API request failed" | Check key & internet |
| No response | Wait 2-3 seconds |

## Files to Know

- `viewer/src/config.js` - Your API key
- `AI_FEATURE_SETUP.md` - Detailed setup
- `AI_ASSISTANT_README.md` - Full docs
- `WHATS_NEW.md` - Feature overview

## Key Features

✅ **Automatic** - No button clicking
✅ **Comprehensive** - All info in one place
✅ **Visual** - Indigo highlight
✅ **Context** - Nearby anomalies
✅ **Actionable** - Clear YES/NO
✅ **Specific** - Uses real numbers

## Server

```bash
# Start
cd viewer && npm run dev

# Access
http://localhost:5173/

# Stop
Ctrl+C
```

## That's It!

Click anomalies → Get instant AI explanations 🎉
