const express = require('express');
const { productDB, storeDB, analyticsDB, configDB, apiUsageDB } = require('../database');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();

function getAnthropicApiKey() {
  return (process.env.ANTHROPIC_API_KEY || '').trim();
}

function getAnthropicClient() {
  const apiKey = getAnthropicApiKey();
  return apiKey ? new Anthropic({ apiKey }) : null;
}

function getAiResponseText(message) {
  return message.content.find((block) => block.type === 'text')?.text || '';
}

function parseAiJson(text) {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
}

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
const safeExtras = (extras || '').trim().slice(0, 200);

  if (!budget || !purpose || !storeId)
    return res.status(400).json({ error: 'budget, purpose and storeId required' });

  const parsedBudget = Number(budget);
  if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
    return res.status(400).json({
      error: 'Please enter a valid budget amount.',
      customerMessage: true
    });
  }

  // Check store exists
  const store = await storeDB.findById(storeId);
  if (!store)
    return res.status(404).json({ error: 'Store not found' });

  // Check store is active
  const isActive = await storeDB.isActive(storeId);
  if (!isActive || store.plan_status === 'disabled')
    return res.status(403).json({
      error: 'Service temporarily unavailable.',
      customerMessage: true
    });

  if (store.widget_enabled === 0)
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
  const maxPrice = parsedBudget;
  const filteredProducts = products.filter(p => parseFloat(p.price) <= maxPrice);

  if (!filteredProducts.length)
    return res.status(404).json({ error: 'No affordable products in catalog' });

  const currency = store.currency || 'PKR';
  // Compact catalog line — descriptions are NOT sent (saves ~80% input tokens vs full listings)
  const productList = filteredProducts.map((p, i) =>
    `${i + 1}. [${p.category}] ${p.name} | ${p.price} ${currency}`
  ).join('\n');

  // Check for cached recommendation first (0 API cost)
  const cachedRec = await analyticsDB.getCachedRecommendation(storeId, parsedBudget, purpose, extras || '');
  if (cachedRec) {
    // We still log it so analytics are accurate, but it costs 0 credits
    await analyticsDB.logRecommendation(storeId, parsedBudget, purpose, safeExtras, cachedRec, {
      source: 'cached',
    });
    // If cached rec is old single-build format (has .buildName), wrap it
    const isOldFormat = cachedRec.buildName !== undefined && !cachedRec.builds;
    return res.json({
      success: true,
      builds:   isOldFormat ? [{ ...cachedRec, tier: 'Recommended Build', tagline: 'Previously generated recommendation' }] : (cachedRec.builds || [cachedRec]),
      canBuild: true,
      noBuildsReason: '',
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
    const budgetNum = parseInt(budget);
    const fakeBuilds = [
      {
        tier: 'Budget Build',
        tagline: 'Maximum value, minimum spend',
        buildName: 'Entry Level ' + purpose + ' PC',
        totalPrice: Math.round(budgetNum * 0.75),
        withinBudget: true,
        budgetRemaining: Math.round(budgetNum * 0.25),
        compatible: true,
        compatibilityNote: '',
        parts: [
          { category: 'CPU',     name: 'Test CPU Budget',   price: Math.round(budgetNum*0.3), quantity:1, totalPrice: Math.round(budgetNum*0.3), reason: 'Good value for ' + purpose },
          { category: 'RAM',     name: 'Test RAM 8GB',      price: Math.round(budgetNum*0.15),quantity:1, totalPrice: Math.round(budgetNum*0.15), reason: 'Minimum for smooth use' },
          { category: 'Storage', name: 'Test HDD 1TB',      price: Math.round(budgetNum*0.1), quantity:1, totalPrice: Math.round(budgetNum*0.1), reason: 'Affordable storage' },
          { category: 'PSU',     name: 'Test PSU 450W',     price: Math.round(budgetNum*0.2), quantity:1, totalPrice: Math.round(budgetNum*0.2), reason: 'Sufficient power' },
        ],
        missingCategories: ['Motherboard', 'Case'],
        summary: 'A basic build that covers the essentials. Best for tight budgets.',
        tips: 'AI is in TEST_MODE. Remove TEST_MODE from Railway to enable real builds.',
        budgetAdvice: 'You have budget left — consider adding a case or monitor later.'
      },
      {
        tier: 'Balanced Build',
        tagline: 'Best performance per rupee',
        buildName: 'Mid-Range ' + purpose + ' PC',
        totalPrice: Math.round(budgetNum * 0.88),
        withinBudget: true,
        budgetRemaining: Math.round(budgetNum * 0.12),
        compatible: true,
        compatibilityNote: '',
        parts: [
          { category: 'CPU',     name: 'Test CPU Mid',      price: Math.round(budgetNum*0.35),quantity:1, totalPrice: Math.round(budgetNum*0.35), reason: 'Great performance for ' + purpose },
          { category: 'RAM',     name: 'Test RAM 16GB',     price: Math.round(budgetNum*0.18),quantity:1, totalPrice: Math.round(budgetNum*0.18), reason: 'Sweet spot for multitasking' },
          { category: 'Storage', name: 'Test SSD 512GB',    price: Math.round(budgetNum*0.12),quantity:1, totalPrice: Math.round(budgetNum*0.12), reason: 'Fast NVMe storage' },
          { category: 'PSU',     name: 'Test PSU 550W',     price: Math.round(budgetNum*0.23),quantity:1, totalPrice: Math.round(budgetNum*0.23), reason: 'Headroom for upgrades' },
        ],
        missingCategories: ['GPU'],
        summary: 'The sweet spot. Best balance of performance and price for ' + purpose + '.',
        tips: 'TEST_MODE is on. This is fake data.',
        budgetAdvice: 'Small budget remaining — save for a GPU upgrade.'
      },
      {
        tier: 'Max Build',
        tagline: 'Everything your budget can buy',
        buildName: 'Full ' + purpose + ' Beast',
        totalPrice: Math.round(budgetNum * 0.97),
        withinBudget: true,
        budgetRemaining: Math.round(budgetNum * 0.03),
        compatible: true,
        compatibilityNote: '',
        parts: [
          { category: 'CPU',     name: 'Test CPU High-End', price: Math.round(budgetNum*0.38),quantity:1, totalPrice: Math.round(budgetNum*0.38), reason: 'Top performance for ' + purpose },
          { category: 'GPU',     name: 'Test GPU',          price: Math.round(budgetNum*0.3), quantity:1, totalPrice: Math.round(budgetNum*0.3), reason: 'Handles demanding tasks' },
          { category: 'RAM',     name: 'Test RAM 32GB',     price: Math.round(budgetNum*0.15),quantity:1, totalPrice: Math.round(budgetNum*0.15), reason: 'Maximum RAM for future proofing' },
          { category: 'Storage', name: 'Test NVMe 1TB',     price: Math.round(budgetNum*0.14),quantity:1, totalPrice: Math.round(budgetNum*0.14), reason: 'Fast and spacious' },
        ],
        missingCategories: [],
        summary: 'Maximum performance within your budget. Built to last. Ideal for serious ' + purpose + '.',
        tips: 'TEST_MODE is on. Remove TEST_MODE from Railway env to get real AI builds.',
        budgetAdvice: 'Budget nearly fully used. You\'re getting the most out of your money.'
      }
    ];
    await analyticsDB.logRecommendation(storeId, parsedBudget, purpose, safeExtras, fakeBuilds[1], {
      source: 'test',
    });
    return res.json({
      success: true,
      builds: fakeBuilds,
      canBuild: true,
      noBuildsReason: '',
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
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    console.error('Recommend error: ANTHROPIC_API_KEY is missing or empty. Set it in Railway Variables.');
    return res.status(503).json({
      error: 'Our AI is taking a quick coffee break! Please try again in a few minutes.',
      customerMessage: true
    });
  }

  const prompt = `PC build advisor for a Pakistani store. Return valid JSON only — no markdown.

CUSTOMER: Budget ${parsedBudget} ${currency} | Purpose: ${purpose} | Extras: ${safeExtras || 'None'}

CATALOG (format: #. [category] exact_product_name | price ${currency}):
${productList}

TASK: Create exactly 3 builds — "Budget Build" (70-80% budget), "Balanced Build" (88-95%), "Max Build" (~100%).
Use ONLY exact product names from the catalog. Never invent products. Different total prices per tier.
If budget < 30000 ${currency}, set canBuild false with noBuildsReason.
Match CPU socket, RAM type (DDR4/DDR5), PSU wattage (20% headroom), case/board size. Quantities allowed (e.g. 2x RAM).

Optimize for purpose: Gaming→GPU+CPU; Editing→RAM+CPU+SSD; Office→value CPU+8GB RAM; Coding→16GB+fast CPU.

Keep text fields SHORT to save tokens: tagline ≤12 words, reason ≤12 words, summary ≤25 words, tips ≤20 words, budgetAdvice ≤15 words, compatibilityNote ≤15 words if needed.

JSON schema:
{"canBuild":true,"noBuildsReason":"","builds":[{"tier":"Budget Build","tagline":"","buildName":"","totalPrice":0,"withinBudget":true,"budgetRemaining":0,"compatible":true,"compatibilityNote":"","parts":[{"category":"","name":"exact name from catalog","price":0,"quantity":1,"totalPrice":0,"reason":""}],"missingCategories":[],"summary":"","tips":"","budgetAdvice":""}]}`;

  try {
    const aiSettings = await configDB.getAiSettings();
    const message = await anthropic.messages.create({
      model:      aiSettings.model,
      max_tokens: aiSettings.maxTokens,
      messages:   [{ role: 'user', content: prompt }]
    });

    if (message.stop_reason === 'max_tokens') {
      console.error(
        `Recommend error: AI response truncated at ${aiSettings.maxTokens} tokens. ` +
        'Increase anthropic_max_tokens in Admin → API & Model or reduce catalog size.'
      );
      return res.status(500).json({
        error: 'Our AI is taking a quick coffee break! Please try again in a few minutes.',
        customerMessage: true
      });
    }

    let parsed;
    try {
      parsed = parseAiJson(getAiResponseText(message));
    } catch (parseErr) {
      console.error('Recommend error: Failed to parse AI JSON:', parseErr.message);
      return res.status(500).json({
        error: 'Our AI is taking a quick coffee break! Please try again in a few minutes.',
        customerMessage: true
      });
    }

    if (!parsed)
      return res.status(500).json({ error: 'AI response invalid', customerMessage: true });

    const inputTokens = message.usage?.input_tokens || 0;
    const outputTokens = message.usage?.output_tokens || 0;
    const estCostUsd = apiUsageDB.estimateCostUsd(
      inputTokens,
      outputTokens,
      aiSettings.inputPricePerM,
      aiSettings.outputPricePerM
    );

    await analyticsDB.logRecommendation(
      storeId,
      parsedBudget,
      purpose,
      extras || '',
      parsed.builds?.[0] || parsed,
      {
        source: 'ai',
        model: aiSettings.model,
        inputTokens,
        outputTokens,
        estCostUsd,
      }
    );

    res.json({
      success: true,
      builds:    parsed.builds || [],
      canBuild:  parsed.canBuild !== false,
      noBuildsReason: parsed.noBuildsReason || '',
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
    if (err.status === 401) {
      console.error(
        'Recommend error: Anthropic rejected ANTHROPIC_API_KEY (401 invalid x-api-key). ' +
        'In Railway → Variables, set ANTHROPIC_API_KEY to a valid key from console.anthropic.com — no quotes or extra spaces.'
      );
    } else if (err.status === 404 && err.error?.error?.message?.startsWith('model:')) {
      console.error(
        `Recommend error: Anthropic model not found (${err.error.error.message}). ` +
        'Update model in Admin → API & Model or ANTHROPIC_MODEL env var.'
      );
    } else {
      console.error('Recommend error:', err);
    }
    res.status(500).json({
      error: 'Our AI is taking a quick coffee break! Please try again in a few minutes.',
      customerMessage: true
    });
  }
});

module.exports = router;