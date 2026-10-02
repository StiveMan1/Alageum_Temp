# Strapi CMS catalog authoring

The local `alageum-catalog` plugin provides catalog editing inside the actual
Strapi administration application at `/cms/plugins/alageum-catalog`. It uses
Strapi administrator accounts and the explicit `plugin::alageum-catalog.manage`
permission. B2B tokens, tenant administrators and ordinary CMS accounts without
that permission cannot use its endpoints.

The editor supports product creation, search and pagination, names/descriptions
in RU/KZ/EN/CN/UZ, category, SKU, slug, comparison eligibility, publication state
and exact decimal pricing. Public keys and transport UUIDs remain immutable after
creation. Existing translations outside those five languages, technical
specifications, source evidence and media are preserved on an ordinary edit.
This first editor does not yet offer category authoring, media uploads or editing
of the full structured specification/provenance fields. Public editorial pages
are still outside the connected CMS delivery slice.

## Authorization and writes

Admin routes are scoped under `/alageum-catalog`, with native Strapi
authentication and permission policies. They reuse the catalog domain write path
through a separate CMS authorizer; they do not fabricate B2B memberships or
reuse B2B credentials. Each write rechecks the active native administrator,
native session and exact unrestricted plugin permission inside its PostgreSQL
transaction. Conditional or field-restricted grants fail closed for this global
catalog action.

The shared domain service enforces version conflicts, canonical identity,
strict validation and atomic before/after audit. CMS events identify the native
administrator as `event_metadata.cms_admin_id` with `source: "cms"`; B2B actor
and tenant columns stay null. A failed audit rolls back the edit. Hiding a
product removes it from public reads; restoring it creates a draft that requires
an explicit publish edit. Published edits become available through the existing
`/api/v1/catalog/products/:id` adapter immediately, without changing the UUID.

Generated Content Manager/document-service catalog writes remain blocked. This
prevents an alternate path from bypassing validation, optimistic versions or
audit. The CMS plugin and the existing Next editor share one catalog source.

The editor keeps local values after a conflict and provides “Reload product” to
retrieve the new version. Close and Back/Forward navigation invalidate pending
editor responses; repeated save clicks share an in-flight guard. Server
authorization is authoritative even if a menu item is hidden.

## Native authentication and verification

The pinned Strapi version serves UI under `/cms` and native authentication APIs
under `/admin`. The native cookie path must cover the actual login, refresh and
UI reload behavior; the test suite exercises this routing. Test administrators
exist only in a separately isolated browser database and have randomly generated
disposable passwords. The fixture refuses to alter an existing CMS user.
No production CMS administrator or persistent credential is created by this
checkpoint.

The PostgreSQL and browser checks cover native login, permission denial, role or
session revocation, immutable identifiers, stale versions, audit rollback and
published-edit visibility. Configured browser coverage is not a passed result:
consult [validation evidence](node-strapi-validation.md) for the exact commit and
completed stages. The dependency audit gate and production startup interlock
remain enabled.

Implementation follows the official [local plugin entry points](https://docs.strapi.io/cms/plugins-development/create-a-plugin),
[admin panel API](https://docs.strapi.io/cms/plugins-development/admin-panel-api)
and [plugin server API](https://docs.strapi.io/cms/plugins-development/server-api).
