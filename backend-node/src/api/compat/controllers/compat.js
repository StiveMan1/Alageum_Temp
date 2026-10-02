"use strict";
const { AppError } = require("../../../domain/errors");
const { pagination } = require("../../../domain/catalog");
module.exports = ({ strapi }) => ({
  async health(ctx) {
    await strapi.db.connection.raw("SELECT 1");
    ctx.body = {
      status: "ok",
      backend: "node-strapi",
      migration: "bounded-phase-1",
    };
  },
  login: (ctx) => strapi.alageum.auth.login(ctx),
  refresh: (ctx) => strapi.alageum.auth.refresh(ctx),
  logout: (ctx) => strapi.alageum.auth.logout(ctx),
  me: (ctx) => strapi.alageum.auth.me(ctx),
  organizations: (ctx) => strapi.alageum.auth.organizations(ctx),
  organizationProfile: (ctx) => strapi.alageum.organizationProfile.get(ctx),
  updateOrganizationProfile: (ctx) => strapi.alageum.organizationProfile.update(ctx),
  categories: (ctx) => strapi.alageum.catalog.categoryList(ctx),
  products: (ctx) => strapi.alageum.catalog.list(ctx),
  product: (ctx) => strapi.alageum.catalog.get(ctx),
  compare: (ctx) => strapi.alageum.catalog.compare(ctx),
  async filters(ctx) {
    require("../../../domain/catalog-validation").parse(
      require("../../../domain/catalog-validation").uuid,
      ctx.query.category_id,
    );
    ctx.body = { items: [], ...pagination(ctx.query), total: 0 };
  },
  adminCategories: (ctx) => strapi.alageum.catalog.categoryList(ctx, true),
  adminProducts: (ctx) => strapi.alageum.catalog.list(ctx, true),
  adminProduct: (ctx) => strapi.alageum.catalog.get(ctx, true),
  createProduct: (ctx) => strapi.alageum.catalog.create(ctx),
  updateProduct: (ctx) => strapi.alageum.catalog.update(ctx),
  hideProduct: (ctx) => strapi.alageum.catalog.update(ctx, "hide"),
  restoreProduct: (ctx) => strapi.alageum.catalog.update(ctx, "restore"),
  createQuote: (ctx) => strapi.alageum.quotes.create(ctx),
  quotes: (ctx) => strapi.alageum.quotes.list(ctx),
  quote: (ctx) => strapi.alageum.quotes.detail(ctx),
});
