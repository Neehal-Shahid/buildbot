const { configDB } = require('../database');

async function getPublicPlanConfig() {
  const c = await configDB.getAll();
  const trialDays = Number(c.trial_days || 14);
  const trialDailyLimit = Number(c.trial_daily_limit || 3);
  const paymentNumber = c.payment_number || '';

  const plans = {
    starter: {
      label: 'Starter',
      price: Number(c.starter_price || 2999),
      monthlyLimit: Number(c.starter_monthly_limit || 500),
    },
    growth: {
      label: 'Growth',
      price: Number(c.growth_price || 4999),
      monthlyLimit: Number(c.growth_monthly_limit || 2000),
    },
    pro: {
      label: 'Pro',
      price: Number(c.pro_price || 7999),
      monthlyLimit: null,
    },
  };

  return { trialDays, trialDailyLimit, paymentNumber, plans };
}

function formatPlanLimit(planKey, config) {
  if (planKey === 'trial') {
    return `${config.trialDailyLimit}/day`;
  }
  const plan = config.plans[planKey];
  if (!plan) return '—';
  if (plan.monthlyLimit == null) return 'Unlimited';
  return `${plan.monthlyLimit.toLocaleString()}/mo`;
}

module.exports = { getPublicPlanConfig, formatPlanLimit };
