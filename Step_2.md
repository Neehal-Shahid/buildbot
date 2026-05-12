## CHUNK 2 — `server/database.js`

**File to edit:** `server/database.js` only.

**Step 1 — Add `plan_ends` and `admin_notes` migrations.**

In the `migrations` array inside `initDB`, add these two new entries at the end of the array before the closing `]`:

```js
`ALTER TABLE stores ADD COLUMN plan_ends TEXT DEFAULT ''`,
`ALTER TABLE stores ADD COLUMN admin_notes TEXT DEFAULT ''`,
```

**Step 2 — Update `paymentDB.approve` to also set `plan_ends`.**

Find the existing `approve` method in `paymentDB`:

```js
approve: async (paymentId, storeId, plan) => {
  await client.execute({
    sql:  "UPDATE payments SET status = 'approved' WHERE id = ?",
    args: [paymentId]
  });
  await client.execute({
    sql:  "UPDATE stores SET plan = ?, plan_status = 'active' WHERE store_id = ?",
    args: [plan, storeId]
  });
},
```

Replace with:

```js
approve: async (paymentId, storeId, plan) => {
  await client.execute({
    sql:  "UPDATE payments SET status = 'approved' WHERE id = ?",
    args: [paymentId]
  });
  // Set plan and record plan_ends as 30 days from today for dunning tracking
  await client.execute({
    sql: `UPDATE stores 
          SET plan = ?, plan_status = 'active', plan_ends = date('now', '+30 days')
          WHERE store_id = ?`,
    args: [plan, storeId]
  });
},
```

**Step 3 — Add new methods to `storeDB`.**

In the `storeDB` object, add these methods before its closing `}`. Do not modify any existing method:

```js
  // Set plan manually with optional plan_ends date (admin override)
  setPlan: async (storeId, plan, planStatus, planEnds = null) => {
    if (planEnds) {
      return await client.execute({
        sql: 'UPDATE stores SET plan = ?, plan_status = ?, plan_ends = ? WHERE store_id = ?',
        args: [plan, planStatus, planEnds, storeId]
      });
    }
    return await client.execute({
      sql: 'UPDATE stores SET plan = ?, plan_status = ? WHERE store_id = ?',
      args: [plan, planStatus, storeId]
    });
  },

  // Extend trial by N days from today or current trial_ends, whichever is later
  extendTrial: async (storeId, days) => {
    return await client.execute({
      sql: `UPDATE stores SET
              trial_ends = date(MAX(COALESCE(NULLIF(trial_ends,''), date('now')), date('now')), '+${days} days'),
              plan = 'trial',
              plan_status = 'active'
            WHERE store_id = ?`,
      args: [storeId]
    });
  },

  // Save internal admin notes for a store
  setNotes: async (storeId, notes) => {
    return await client.execute({
      sql: 'UPDATE stores SET admin_notes = ? WHERE store_id = ?',
      args: [notes, storeId]
    });
  },

  // Get trial stores expiring in exactly N days — used for trial warning emails
  getTrialEndingIn: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE plan = 'trial'
            AND plan_status = 'active'
            AND date(trial_ends) = date('now', '+${days} days')`,
      args: []
    });
    return res.rows;
  },

  // Get paid stores whose plan_ends was exactly N days ago — used for dunning emails
  // plan_ends is set when a payment is approved. Requires plan_ends column (migration added above).
  getPlanLapsedBy: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE plan != 'trial'
            AND plan_status = 'active'
            AND plan_ends != ''
            AND plan_ends IS NOT NULL
            AND date(plan_ends) = date('now', '-${days} days')`,
      args: []
    });
    return res.rows;
  },

  // Get stores that created their account exactly N days ago — used for onboarding drip
  getSignedUpDaysAgo: async (days) => {
    const res = await client.execute({
      sql: `SELECT * FROM stores
            WHERE date(created_at) = date('now', '-${days} days')`,
      args: []
    });
    return res.rows;
  },
```

**Step 4 — Add `getStalePending` to `paymentDB`.**

In the `paymentDB` object, add this method before its closing `}`:

```js
  // Get pending payments older than N hours — used for admin stale payment alert
  getStalePending: async (hours) => {
    const res = await client.execute({
      sql: `SELECT p.*, s.name, s.email FROM payments p
            JOIN stores s ON p.store_id = s.store_id
            WHERE p.status = 'pending'
            AND p.created_at <= datetime('now', '-${hours} hours')`,
      args: []
    });
    return res.rows;
  },
```

---

