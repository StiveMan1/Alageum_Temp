"use strict";
// Reimplemented disposable native Page fixtures; never used by bootstrap.
const { randomBytes } = require("node:crypto");
const { UID, FIELDS } = require("../src/domain/pages");
const { drainNativeAdminMetrics } = require("./seed-test-cms-admins");
async function seedTestPageAdmins(strapi) {
  const url = new URL(process.env.DATABASE_URL || "");
  if (!["postgres:", "postgresql:"].includes(url.protocol) || process.env.APP_ENV !== "test" || process.env.ALAGEUM_TEST_PAGE_FIXTURES !== "1" || !["localhost", "127.0.0.1"].includes(url.hostname) || decodeURIComponent(url.pathname) !== "/alageum_strapi_pages_test" || url.search || url.hash) throw new Error("Page fixtures require the dedicated loopback alageum_strapi_pages_test database and explicit test opt-in");
  if (strapi.config.get("alageum.env") !== "test") throw new Error("Loaded Strapi instance is not in test mode");
  const actual = await strapi.db.connection.raw("select current_database() as database");
  if (actual.rows[0].database !== "alageum_strapi_pages_test" || await strapi.admin.services.user.exists()) throw new Error("Page fixtures require a fresh isolated database without CMS administrators");
  return drainNativeAdminMetrics(strapi, async () => {
    const users = {};
    for (const [kind, actions] of Object.entries({ editor: ["read", "create", "update"], publisher: ["read", "publish"], denied: [] })) {
      const role = await strapi.admin.services.role.create({ name: `Disposable Page ${kind}`, code: `alageum-page-test-${kind}`, description: "Isolated Page verification only" });
      await strapi.admin.services.role.assignPermissions(role.id, actions.map(action => ({ action: `plugin::content-manager.explorer.${action}`, subject: UID, conditions: [], properties: ["read", "create", "update"].includes(action) ? { fields: FIELDS } : {} })));
      const password = `Aa1!${randomBytes(32).toString("hex")}`;
      const email = `page-${kind}@node-ci.example`;
      const user = await strapi.admin.services.user.create({ firstname: "Disposable", lastname: `Page ${kind}`, email, password, isActive: true, blocked: false, registrationToken: null, preferedLanguage: "en", roles: [role.id] });
      users[kind] = { id: user.id, email, password, role: role.id };
    }
    return users; // Keep generated passwords only in caller memory.
  });
}
module.exports = { seedTestPageAdmins };
