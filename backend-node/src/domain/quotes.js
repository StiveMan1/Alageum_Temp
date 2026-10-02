"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { AppError } = require("./errors");
const {
  table,
  uuid,
  strictObject,
  pagination,
  header,
  privateResponse,
  assertActiveContext,
} = require("./auth");

const MAX_ITEMS = 100;
const MAX_QUANTITY = "999999999999999.999";
const Decimal = require("decimal.js");
const invalid = (message) => {
  throw new AppError("validation_error", message, 422);
};

// Match the frozen Decimal(18,3) v1 contract without binary floating-point drift.
function quantity(value) {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    invalid("Quantity must be a finite decimal");
  const text = String(value).trim();
  if (
    text.length > 64 ||
    !/^[+]?((\d+(\.\d*)?)|(\.\d+))([eE][+-]?\d+)?$/.test(text)
  )
    invalid("Quantity must be a positive decimal");
  let decimal;
  try {
    decimal = new Decimal(text);
  } catch {
    invalid("Quantity must be a decimal");
  }
  if (
    !decimal.isFinite() ||
    !decimal.gt(0) ||
    decimal.gt(MAX_QUANTITY) ||
    decimal.decimalPlaces() > 3
  )
    invalid("Quantity must fit a positive Decimal(18,3)");
  return decimal.toFixed();
}
function validateBody(body) {
  strictObject(body, ["comment", "items"]);
  if (
    body.comment !== undefined &&
    body.comment !== null &&
    (typeof body.comment !== "string" ||
      body.comment.length > 4000 ||
      body.comment.includes("\0"))
  )
    invalid("Comment must be at most 4000 characters");
  if (
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > MAX_ITEMS
  )
    invalid(`Select between 1 and ${MAX_ITEMS} products`);
  const ids = new Set();
  const items = body.items.map((item) => {
    strictObject(item, ["product_id", "quantity"], "Quote item");
    const product_id = uuid(item.product_id, "product_id");
    if (ids.has(product_id))
      throw new AppError(
        "quote_duplicate_product",
        "Use one line per product",
        422,
      );
    ids.add(product_id);
    return { product_id, quantity: quantity(item.quantity) };
  });
  return { comment: body.comment ?? null, items };
}
function fingerprint(body) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        comment: body.comment,
        items: [...body.items].sort((a, b) =>
          a.product_id.localeCompare(b.product_id),
        ),
      }),
    )
    .digest("hex");
}
function snapshot(product) {
  // An explicit public allowlist avoids leaking CMS metadata or trusting client prices.
  return JSON.parse(
    JSON.stringify({
      public_key: product.public_key,
      slug: product.slug,
      sku: product.sku,
      translations: product.translations || {},
      specs: product.specs || {},
      category_public_key: product.category_public_key,
      version: product.version,
      price:
        product.price === null || product.price === undefined
          ? null
          : String(product.price),
      currency: product.currency,
      price_mode: product.price_mode,
    }),
  );
}
async function ensureSchema(db) {
  await db.transaction(async (tx) => {
    await tx.raw("SELECT pg_advisory_xact_lock(731624112)");
    await tx.raw("CREATE SCHEMA IF NOT EXISTS b2b");
    const schema = () => tx.schema.withSchema("b2b");
    if (!(await schema().hasTable("quote_requests")))
      await schema().createTable("quote_requests", (t) => {
        t.uuid("id").primary();
        t.uuid("organization_id")
          .notNullable()
          .references("id")
          .inTable("b2b.organizations");
        t.uuid("created_by_id")
          .notNullable()
          .references("id")
          .inTable("b2b.users");
        t.string("status", 60).notNullable().defaultTo("submitted");
        t.text("comment");
        t.uuid("idempotency_key").notNullable();
        t.string("request_hash", 64).notNullable();
        t.timestamp("created_at", { useTz: true })
          .notNullable()
          .defaultTo(tx.fn.now());
        t.timestamp("updated_at", { useTz: true })
          .notNullable()
          .defaultTo(tx.fn.now());
        t.unique(["organization_id", "created_by_id", "idempotency_key"], {
          indexName: "uq_b2b_quote_submission",
        });
        t.index(["organization_id", "created_by_id", "created_at"]);
        t.check("status = 'submitted'", [], "quote_status_submitted");
      });
    if (!(await schema().hasTable("quote_request_items")))
      await schema().createTable("quote_request_items", (t) => {
        t.uuid("id").primary();
        t.uuid("quote_request_id")
          .notNullable()
          .references("id")
          .inTable("b2b.quote_requests")
          .onDelete("CASCADE");
        // CMS records may be removed; the snapshot remains the historical source of truth.
        t.uuid("product_id").notNullable();
        t.decimal("quantity", 18, 3).notNullable();
        t.integer("position").notNullable();
        t.jsonb("product_snapshot").notNullable();
        t.unique(["quote_request_id", "product_id"]);
        t.unique(["quote_request_id", "position"]);
        t.check(
          "quantity > 0 AND quantity <= 999999999999999.999",
          [],
          "quote_quantity_bounds",
        );
        t.check(
          "position >= 0 AND position < 100",
          [],
          "quote_position_bounds",
        );
      });
    // Bounded local schema evolution: widen prior phase limits without dropping data.
    await tx.raw(
      "ALTER TABLE b2b.quote_request_items DROP CONSTRAINT IF EXISTS quote_position_bounds, DROP CONSTRAINT IF EXISTS quote_quantity_bounds",
    );
    await tx.raw(
      "ALTER TABLE b2b.quote_request_items ADD CONSTRAINT quote_position_bounds CHECK (position >= 0 AND position < 100), ADD CONSTRAINT quote_quantity_bounds CHECK (quantity > 0 AND quantity <= 999999999999999.999)",
    );
  });
}
function summary(quote, count) {
  return {
    id: quote.id,
    status: quote.status,
    comment: quote.comment,
    item_count: count,
    created_at: new Date(quote.created_at).toISOString(),
  };
}
function own(db, context) {
  return table(db, "quote_requests").where({
    organization_id: context.organization_id,
    created_by_id: context.user.id,
  });
}
function snapshotOut(value) {
  const result = typeof value === "string" ? JSON.parse(value) : value;
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new Error("Stored quote snapshot is invalid");
  return result;
}
async function detailOut(db, quote) {
  const items = await table(db, "quote_request_items")
    .where({ quote_request_id: quote.id })
    .select(
      "id",
      "product_id",
      "product_snapshot",
      db.raw("quantity::text AS quantity"),
    )
    .orderBy("position")
    .orderBy("id");
  return {
    ...summary(quote, items.length),
    items: items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: String(item.quantity),
      product_snapshot: snapshotOut(item.product_snapshot),
    })),
  };
}
function checkReplay(quote, hash) {
  if (quote.request_hash !== hash)
    throw new AppError(
      "idempotency_conflict",
      "This submission key was already used for a different request",
      409,
    );
}
function createQuotes({ db, catalog, audit, auth }) {
  if (
    !catalog ||
    typeof catalog.getForQuote !== "function" ||
    typeof audit !== "function"
  )
    throw new TypeError(
      "Catalog and transactional audit adapters are required",
    );

  async function authorized(ctx, code) {
    if (auth) return auth.permission(ctx, code);
    const context = ctx.state && ctx.state.auth;
    if (!context)
      throw new AppError(
        "authentication_required",
        "Authentication required",
        401,
      );
    if (!context.permissions?.has(code))
      throw new AppError(
        "permission_denied",
        `Permission '${code}' is required`,
        403,
      );
    return context;
  }
  async function submit({ context, body: input, key: inputKey, ctx = {} }) {
    const body = validateBody(input);
    const key = uuid(inputKey, "Idempotency-Key");
    const hash = fingerprint(body);
    try {
      return await db.transaction(async (tx) => {
        await assertActiveContext(tx, context, "quote.create");
        // Cross-process serialization, scoped by tenant + owner + UUID; the unique index is the final backstop.
        await tx.raw("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", [
          `${context.organization_id}:${context.user.id}:${key}`,
        ]);
        const existing = await own(tx, context)
          .where({ idempotency_key: key })
          .first();
        if (existing) {
          checkReplay(existing, hash);
          return { quote: await detailOut(tx, existing), created: false };
        }
        const ids = body.items.map((item) => item.product_id);
        // Adapter locks published products and visible categories until this transaction commits.
        const products = await catalog.getForQuote(tx, ids);
        const byId = new Map(
          products.map((product) => [
            String(product.id).toLowerCase(),
            product,
          ]),
        );
        const missing = ids.filter((id) => !byId.has(id));
        if (missing.length)
          throw new AppError(
            "quote_product_unavailable",
            "Some selected products are no longer available for inquiry",
            422,
            { product_ids: missing },
          );
        const [quote] = await table(tx, "quote_requests")
          .insert({
            id: randomUUID(),
            organization_id: context.organization_id,
            created_by_id: context.user.id,
            status: "submitted",
            comment: body.comment,
            idempotency_key: key,
            request_hash: hash,
          })
          .returning("*");
        await table(tx, "quote_request_items").insert(
          body.items.map((item, position) => ({
            id: randomUUID(),
            quote_request_id: quote.id,
            product_id: item.product_id,
            quantity: item.quantity,
            position,
            product_snapshot: JSON.stringify(
              snapshot(byId.get(item.product_id)),
            ),
          })),
        );
        await audit(tx, ctx, {
          action: "quote.create",
          actor_user_id: context.user.id,
          organization_id: context.organization_id,
          entity_type: "quote",
          entity_id: quote.id,
        });
        return { quote: await detailOut(tx, quote), created: true };
      });
    } catch (error) {
      // Only the known submission constraint can be recovered as an idempotent replay.
      if (
        error.code !== "23505" ||
        error.constraint !== "uq_b2b_quote_submission"
      )
        throw error;
      return db.transaction(async (tx) => {
        await assertActiveContext(tx, context, "quote.create");
        const existing = await own(tx, context)
          .where({ idempotency_key: key })
          .first();
        if (!existing) throw error;
        checkReplay(existing, hash);
        return { quote: await detailOut(tx, existing), created: false };
      });
    }
  }
  async function create(ctx) {
    const context = await authorized(ctx, "quote.create");
    const result = await submit({
      context,
      body: ctx.request.body,
      key: header(ctx, "Idempotency-Key"),
      ctx,
    });
    ctx.body = result.quote;
    ctx.status = result.created ? 201 : 200;
    privateResponse(ctx);
    ctx.set("Location", `/api/v1/quotes/${result.quote.id}`);
  }
  async function list(ctx) {
    const context = await authorized(ctx, "quote.read");
    const query = ctx.query || {};
    if (query.mine !== "true" && query.mine !== true)
      invalid("Only mine=true request history is supported");
    const page = pagination(query);
    const [count, quotes] = await Promise.all([
      own(db, context).count("* as total").first(),
      own(db, context)
        .orderBy("created_at", "desc")
        .orderBy("id")
        .limit(page.page_size)
        .offset((page.page - 1) * page.page_size),
    ]);
    const counts = quotes.length
      ? await table(db, "quote_request_items")
          .whereIn(
            "quote_request_id",
            quotes.map((quote) => quote.id),
          )
          .select("quote_request_id")
          .count("* as total")
          .groupBy("quote_request_id")
      : [];
    const byId = new Map(
      counts.map((value) => [value.quote_request_id, Number(value.total)]),
    );
    ctx.body = {
      items: quotes.map((quote) => summary(quote, byId.get(quote.id) || 0)),
      ...page,
      total: Number(count.total),
    };
    privateResponse(ctx);
    ctx.status = 200;
  }
  async function detail(ctx) {
    const context = await authorized(ctx, "quote.read");
    const id = uuid(ctx.params.quote_id || ctx.params.id, "quote_id");
    const quote = await own(db, context).where({ id }).first();
    if (!quote) throw new AppError("quote_not_found", "Request not found", 404);
    ctx.body = await detailOut(db, quote);
    privateResponse(ctx);
    ctx.status = 200;
  }
  return { create, list, detail, submit };
}

module.exports = {
  ensureSchema,
  createQuotes,
  validateBody,
  quantity,
  fingerprint,
  snapshot,
  snapshotOut,
  MAX_ITEMS,
  MAX_QUANTITY,
};
