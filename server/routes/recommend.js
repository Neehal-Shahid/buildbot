const express = require('express');
const { productDB, storeDB, analyticsDB } = require('../database');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/recommend', async (req, res) => {
  const { budget, purpose, extras, storeId } = req.body;

  if (!budget || !purpose || !storeId)
    return res.status(400).json({ error: 'budget, purpose and storeId required' });

  // Check store exists
  const store = await storeDB.findById(storeId);
  if (!store)
    return res.status(404).json({ error: 'Store not found' });

  // Check store is active
  const isActive = await storeDB.isActive(storeId);
  if (!isActive)
    return res.status(403).json({
      error: 'This store\'s trial has expired. The store owner needs to upgrade their plan.'
    });

  // Check recommendation limit
  const limitCheck = await analyticsDB.checkLimit(storeId, store.plan);
  if (!limitCheck.allowed) {
    const msg = store.plan === 'trial'
      ? `Daily limit reached. This store has used all ${limitCheck.limit} free recommendations for today. Come back tomorrow!`
      : `Monthly limit reached. This store has used ${limitCheck.used}/${limitCheck.limit} recommendations this month.`;
    return res.status(429).json({ error: msg, limitReached: true });
  }

  // Get products
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
Select best compatible parts within budget. Respond ONLY in this JSON format:
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
      model:      'claude-opus-4-5',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }]
    });

    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
      return res.status(500).json({ error: 'AI response invalid' });

    const recommendation = JSON.parse(jsonMatch[0]);
    await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', recommendation);

    // Send remaining info to widget
    res.json({
      success: true,
      recommendation,
      currency,
      usage: {
        used:      limitCheck.used + 1,
        limit:     limitCheck.limit,
        remaining: limitCheck.remaining - 1,
        period:    limitCheck.period
      }
    });

  } catch (err) {
    console.error('Recommend error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;