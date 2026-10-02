"use strict";
const authModule = require("./domain/auth");
const supportModule = require("./domain/support");
const ordersModule = require("./domain/orders");
const quoteModule = require("./domain/quotes");
const auditModule = require("./domain/audit");
const organizationProfileModule = require("./domain/organization-profile");
const { createCatalog } = require("./domain/catalog");
const { createCmsCatalogAuthorizer } = require("./domain/cms-catalog");
const { readCatalog } = require("./domain/catalog-source");
const pageEditorial = require("./domain/page-editorial");
module.exports = {
  async register({ strapi }) {
    await pageEditorial.preflightPages(strapi);
    strapi.documents.use(pageEditorial.editorialMiddleware(strapi));
  },
  async bootstrap({ strapi }) {
    const db = strapi.db.connection,
      config = strapi.config.get("alageum");
    await authModule.ensureSchema(db);
    await organizationProfileModule.ensureSchema(db);
    await quoteModule.ensureSchema(db);
    await auditModule.ensureSchema(db);
    await supportModule.ensureSchema(db);
    await ordersModule.ensureSchema(db);
    await pageEditorial.completePageSchema(strapi);
    const auth = authModule.createAuth({
      db,
      config,
      audit: auditModule.audit,
    });
    const catalog = createCatalog({ db, auth, audit: auditModule.audit });
    const quotes = quoteModule.createQuotes({
      db,
      auth,
      catalog,
      audit: auditModule.audit,
    });
    const cmsCatalog = createCatalog({
      db,
      authorizer: createCmsCatalogAuthorizer({ strapi }),
      audit: auditModule.audit,
    });
    const organizationProfile = organizationProfileModule.createOrganizationProfile({ db, auth, audit: auditModule.audit });
    const support = supportModule.createSupport({ db, auth, audit: auditModule.audit });
    const orders = ordersModule.createOrders({ db, auth, audit: auditModule.audit });
    strapi.alageum = { auth, catalog, quotes, cmsCatalog, organizationProfile, support, orders };
    if (config.importCatalog)
      strapi.log.info(
        "Reviewed catalog import: " +
          JSON.stringify(await catalog.importRecords(readCatalog())),
      );
    await auth.seed();
    await support.seedDemo(config);
  },
};
