const express = require('express');
const { productDB, storeDB, analyticsDB } = require('../database');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple In-Memory IP Rate Limiter (15 requests per hour per IP)
const ipRequests = new Map();
setInterval(() => ipRequests.clear(), 60 * 60 * 1000);

router.post('/recommend', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const currentRequests = ipRequests.get(ip) || 0;
  
  if (currentRequests >= 15) {
    return res.status(429).json({
      error: 'Our AI is currently taking a rest. Please try again later or contact the store.',
      customerMessage: true,
      limitReached: false
    });
  }
  
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
      error: 'Service temporarily unavailable.',
      customerMessage: true
    });

  // Check recommendation limit
  const limitCheck = await analyticsDB.checkLimit(storeId, store.plan);
  if (!limitCheck.allowed) {
    return res.status(429).json({
      error: 'Service temporarily unavailable.',
      customerMessage: true,
      limitReached: true
    });
  }

  // Get products
  const products = await productDB.getByStore(storeId);
  if (!products.length)
    return res.status(404).json({ error: 'No products in catalog' });

  // Filter out products that are more expensive than the entire budget
  const maxPrice = parseFloat(budget);
  const filteredProducts = products.filter(p => parseFloat(p.price) <= maxPrice);

  if (!filteredProducts.length)
    return res.status(404).json({ error: 'No affordable products in catalog' });

  const currency    = store.currency || 'PKR';
  // Removed p.description to save 80% token usage per request
  const productList = filteredProducts.map((p, i) =>
    `${i+1}. Name: ${p.name}, Category: ${p.category}, Price: ${p.price} ${currency}`
  ).join('\n');

  // Check for cached recommendation first (0 API cost)
  const cachedRec = await analyticsDB.getCachedRecommendation(storeId, budget, purpose, extras || '');
  if (cachedRec) {
    // We still log it so analytics are accurate, but it costs 0 credits
    await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', cachedRec);
    return res.json({
      success: true,
      recommendation: cachedRec,
      currency,
      usage: {
        used:      limitCheck.used + 1,
        limit:     limitCheck.limit,
        remaining: limitCheck.remaining - 1,
        period:    limitCheck.period
      },
      cached: true
    });
  }

  // TEST MODE — returns fake data without using API credits
  // Remove TEST_MODE variable from Railway when done testing
  if (process.env.TEST_MODE === 'true') {
    const fakeRecommendation = {
      buildName: 'Test Budget Build',
      totalPrice: parseInt(budget) * 0.9,
      withinBudget: true,
      parts: [
        { category: 'CPU',     name: 'Test CPU',        price: 20000, reason: 'Good for ' + purpose },
        { category: 'RAM',     name: 'Test RAM 16GB',   price: 8000,  reason: 'Sufficient for tasks' },
        { category: 'Storage', name: 'Test SSD 512GB',  price: 10000, reason: 'Fast storage' }
      ],
      summary: 'This is a test build. AI is disabled to save API credits.',
      tips: 'Remove TEST_MODE from Railway variables when done testing limits.'
    };
    await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', fakeRecommendation);
    return res.json({
      success: true,
      recommendation: fakeRecommendation,
      currency,
      usage: {
        used:      limitCheck.used + 1,
        limit:     limitCheck.limit,
        remaining: limitCheck.remaining - 1,
        period:    limitCheck.period
      }
    });
  }

  // REAL AI MODE
  const prompt = `You are an expert PC build advisor for a Pakistani PC parts store.

  CUSTOMER REQUIREMENTS:
  - Budget: ${budget} ${currency}
  - Purpose: ${purpose}
  - Extras requested: ${extras || 'None'}
  
  AVAILABLE PRODUCTS IN THIS STORE:
  ${productList}
  
  YOUR TASK:
  Build the best possible PC using ONLY the products listed above.
  
  IMPORTANT RULES:
  1. QUANTITIES: You CAN recommend multiple units of the same product if needed.
     Example: 2x RAM sticks for dual channel, multiple cables, etc.
     If recommending multiple units, multiply the price accordingly.
  
  2. BUDGET HANDLING:
     - If budget is under 30,000 ${currency}: Respond that budget is too low for a complete PC build. Suggest minimum required budget.
     - If budget is tight but possible: Build the most basic working PC and warn the customer.
     - If budget is good: Build the best possible PC for the purpose.
     - Try to stay within budget. If impossible with available products, explain why.
     - If significant budget remains after build, suggest what to do with remaining amount.
  
  3. MISSING CATEGORIES:
     - If a critical component (CPU, Motherboard, RAM, PSU) is not available in the store catalog, mention it clearly in tips.
     - Do NOT invent products that are not in the list above.
     - ONLY recommend products that exist exactly in the list above.
  
  4. PURPOSE OPTIMIZATION:
     - Gaming: Prioritize GPU, then CPU, then RAM (16GB minimum)
     - Video Editing: Prioritize RAM (32GB if possible), CPU, Storage (SSD)
     - Office/Studies: Prioritize value, basic CPU, 8GB RAM, SSD
     - Coding: Prioritize RAM (16GB), fast CPU, SSD storage
     - Designing: Prioritize GPU, RAM, good monitor if available
     - Streaming: Prioritize CPU, RAM, fast internet card if available
  
  5. COMPATIBILITY:
     - Make sure CPU and Motherboard socket types match if detectable from names
     - Make sure PSU wattage is sufficient for the GPU chosen
     - Make sure RAM type matches motherboard if detectable
  
  Respond ONLY in this exact JSON format, no extra text:
  {
    "buildName": "Descriptive name for this build",
    "totalPrice": 0,
    "withinBudget": true,
    "budgetRemaining": 0,
    "parts": [
      {
        "category": "RAM",
        "name": "Exact product name from list",
        "price": 0,
        "quantity": 2,
        "totalPrice": 0,
        "reason": "Why this was chosen"
      }
    ],
    "missingCategories": [],
    "summary": "2-3 sentence summary of this build",
    "tips": "Budget advice, compatibility notes, or upgrade suggestions",
    "budgetAdvice": "What to do with remaining budget OR why budget was insufficient"
  }`;

  try {
    const message = await anthropic.messages.create({
      model:      'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }]
    });

    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
      return res.status(500).json({ error: 'AI response invalid' });

    const recommendation = JSON.parse(jsonMatch[0]);
    await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', recommendation);

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

    // Only count successful requests towards the IP limit
    ipRequests.set(ip, currentRequests + 1);

  } catch (err) {
    console.error('Recommend error:', err);
    res.status(500).json({ error: 'Our AI is taking a quick coffee break! Please try again in a few minutes.' });
  }
});

module.exports = router;