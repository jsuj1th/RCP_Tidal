# AI Assistant Feature

## Overview
The AI Assistant provides intelligent explanations about pipeline anomalies using Featherless.ai's LLM API. It can explain severity scores, identify risk factors, and provide recommendations based on the selected anomaly's data.

## Setup Instructions

### 1. Get Featherless.ai API Key
1. Visit [https://featherless.ai/](https://featherless.ai/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

### 2. Configure the Application
1. Open `viewer/src/config.js`
2. Replace `'YOUR_API_KEY_HERE'` with your actual API key:
   ```javascript
   export const FEATHERLESS_API_KEY = 'your-actual-api-key-here';
   ```
3. Save the file

### 3. Run the Application
```bash
cd viewer
npm run dev
```

## Features

### Quick Questions
Pre-built prompts for common queries:
- **📊 Explain Severity**: Detailed breakdown of the severity score calculation
- **⚠️ Risk Factors**: Analysis of what makes this anomaly risky
- **💡 Recommendations**: Action items based on severity level
- **🔄 Compare Runs**: Comparison of 2015 vs 2022 measurements

### Custom Questions
Type your own questions in the chat input. Examples:
- "What is the estimated time to failure?"
- "Should this anomaly be repaired immediately?"
- "How does the growth rate compare to industry standards?"
- "What inspection frequency do you recommend?"

## How It Works

### Context Provided to AI
When you ask a question, the AI receives:
- **Location Data**: Distance, joint number, orientation
- **Measurements**: 2015 depth, 2022 depth, growth rate
- **Severity Assessment**: Score, level, time to failure
- **Validation**: Match confidence, spatial validation results
- **Methodology**: How severity scores are calculated

### AI Model
- **Provider**: Featherless.ai
- **Model**: Meta-Llama-3.1-8B-Instruct
- **Max Tokens**: 300 (concise responses)
- **Temperature**: 0.7 (balanced creativity/accuracy)

## Usage Tips

1. **Select an Anomaly First**: Click on any anomaly in the 3D view before asking questions
2. **Use Quick Questions**: Start with pre-built prompts to understand the feature
3. **Be Specific**: Ask about specific aspects (depth, growth, location)
4. **Context Matters**: The AI knows all the anomaly's data - reference specific numbers

## Example Conversations

### Example 1: Severity Explanation
**User**: *Clicks "Explain Severity"*

**AI**: "This anomaly scores 72/100 (Critical) due to: 44% current depth (35 pts), 2.14%/yr growth rate (21 pts), 15% total growth (12 pts), and 17 years to failure (4 pts). The high current depth combined with consistent growth makes this a priority for inspection and potential repair."

### Example 2: Custom Question
**User**: "Is this anomaly growing faster than normal?"

**AI**: "Yes, at 2.14%/year, this exceeds typical metal loss growth rates of 0.5-1.5%/year. This accelerated growth suggests active corrosion that requires monitoring every 2-3 years rather than the standard 5-year interval."

## Troubleshooting

### "Please configure your API key"
- You haven't set up your API key in `src/config.js`
- Follow Setup Instructions above

### "API request failed"
- Check your API key is valid
- Verify you have internet connection
- Ensure Featherless.ai service is operational

### "Please select an anomaly first"
- Click on an anomaly in the 3D view before asking questions
- The AI needs context about which anomaly you're asking about

## API Costs

Featherless.ai offers:
- **Free Tier**: Generous limits for testing and small projects
- **Pay-as-you-go**: Very affordable pricing for production use
- **No Credit Card Required**: For free tier

Check [https://featherless.ai/pricing](https://featherless.ai/pricing) for current rates.

## Privacy & Security

- API key is stored locally in `config.js` (never committed to git)
- Only anomaly data is sent to the API (no personal information)
- Responses are not stored or logged
- Add `config.js` to `.gitignore` to prevent accidental commits

## Future Enhancements

Potential improvements:
- [ ] Conversation history
- [ ] Export chat transcripts
- [ ] Multi-anomaly comparison
- [ ] Predictive maintenance scheduling
- [ ] Integration with repair cost estimation
- [ ] Voice input/output
- [ ] Batch analysis of all critical anomalies
