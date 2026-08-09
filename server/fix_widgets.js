const { client } = require("./database");

async function fixWidgets() {
  try {
    const res = await client.execute(
      "UPDATE stores SET widget_enabled = 1 WHERE plan_status = 'active'"
    );
    console.log(`Successfully fixed widgets for active stores.`);

    const resTrial = await client.execute(
      "UPDATE stores SET widget_enabled = 1 WHERE plan = 'trial'"
    );
    console.log(`Successfully fixed widgets for trial stores.`);
    process.exit(0);
  } catch (error) {
    console.error("Error fixing widgets:", error);
    process.exit(1);
  }
}

fixWidgets();
