const express = require('express');
const { productDB, storeDB, analyticsDB } = require('../database');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/recommend', async (req, res) => {
  const { budget, purpose, extras, storeId } = req.body;

  if (!budget || !purpose || !storeId)
    return res.status(400).json({ error: 'budget, purpose and storeId are required' });

  // Check store exists and is active
  const store = storeDB.findById(storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  const isActive = storeDB.isActive(storeId);
  if (!isActive) return res.status(403).json({ error: 'Store subscription has expired. Please contact the store owner.' });

  const products = productDB.getByStore(storeId);
  if (!products.length) return res.status(404).json({ error: 'No products in catalog' });

  const currency = store.currency || 'PKR';

  const productList = products.map((p, i) =>
    `${i + 1}. Name: ${p.name}, Category: ${p.category}, Price: ${p.price} ${currency}, ${p.description}`
  ).join('\n');

  const prompt = `You are a PC build expert assistant. A customer wants help building a PC.

Customer Details:
- Budget: ${budget} ${currency}
- Purpose: ${purpose}
- Extra accessories wanted: ${extras || 'None'}

Available products in the store:
${productList}

Your job:
1. Select the best combination of parts from the list above that fits within the budget
2. Prioritize parts based on the purpose (e.g., for video editing prioritize GPU and RAM, for office work prioritize value)
3. Include any requested extras if budget allows
4. Make sure the build is compatible (matching socket types, sufficient PSU wattage, etc.)
5. If budget is too low for a complete build, say so clearly and suggest what's possible

Respond in this exact JSON format only, no extra text:
{
  "buildName": "Name of this build",
  "totalPrice": 0,
  "withinBudget": true,
  "parts": [
    {
      "category": "CPU",
      "name": "Product name",
      "price": 0,
      "reason": "Why this was chosen"
    }
  ],
  "summary": "2-3 sentence summary of this build and why it suits the purpose",
  "tips": "Any extra tips or warnings"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI response invalid', raw: responseText });

    const recommendation = JSON.parse(jsonMatch[0]);

    // Log to analytics
    analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', recommendation);

    res.json({ success: true, recommendation, currency });
  } catch (err) {
    console.error('Recommend error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;