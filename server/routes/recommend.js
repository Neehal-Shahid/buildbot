const express = require('express');
const { productDB, storeDB, analyticsDB } = require('../database');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/recommend', async (req, res) => {
  const { budget, purpose, extras, storeId } = req.body;
  if (!budget || !purpose || !storeId)
    return res.status(400).json({ error: 'budget, purpose and storeId required' });

  const store = await storeDB.findById(storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });

  const isActive = await storeDB.isActive(storeId);
  if (!isActive)
    return res.status(403).json({ error: 'Store subscription has expired.' });

  const products = await productDB.getByStore(storeId);
  if (!products.length)
    return res.status(404).json({ error: 'No products in catalog' });

  const currency    = store.currency || 'PKR';
  const productList = products.map((p, i) =>
    `${i+1}. Name: ${p.name}, Category: ${p.category}, Price: ${p.price} ${currency}, ${p.description}`
  ).join('\n');

  const prompt = `You are a PC build expert. A customer wants help building a PC.
Customer: Budget: ${budget} ${currency}, Purpose: ${purpose}, Extras: ${extras || 'None'}
Available products:
${productList}
Select best parts within budget. Respond ONLY in this JSON format:
{
  "buildName": "Name",
  "totalPrice": 0,
  "withinBudget": true,
  "parts": [{"category":"CPU","name":"...","price":0,"reason":"..."}],
  "summary": "2-3 sentences",
  "tips": "extra tips"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5', max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI response invalid' });
    const recommendation = JSON.parse(jsonMatch[0]);
    await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', recommendation);
    res.json({ success: true, recommendation, currency });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;