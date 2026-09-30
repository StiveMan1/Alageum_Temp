# API v1 contract

`/api/v1` is frozen as the compatibility namespace. OpenAPI at `/api/openapi.json` is the endpoint
inventory and schema source of truth.

- Breaking request/response or semantic changes require `/api/v2` or an explicitly announced
  migration window.
- Additive optional fields and new endpoints are compatible changes.
- Deprecations are documented, announced for at least one supported client release, then removed
  only at the next major API version.
- Errors use `{ "error": { "code", "message", "details", "request_id" } }`.
- Lists use `{ "items", "page", "page_size", "total" }`; page size is globally bounded.
- Browser clients send short-lived bearer access tokens. Tenant endpoints resolve organization from
  an authenticated active membership selected by `X-Organization-ID`; payload organization IDs are
  not authoritative.
- `401` means authentication/refresh is required, `403` missing permission, `404` missing or hidden
  foreign object, `409` state/idempotency/confirmation conflict, `413` configured payload limit,
  `422` validation, and `429` rate policy.
- Frontend modules consume only Pydantic response schemas through `frontend/lib/api`; ORM models and
  provider payloads are not public contracts.

The current refresh token is isolated behind a browser transport module but remains DEV-only
`sessionStorage`. Cookie/BFF, SameSite and CSRF details require the approved deployment topology.

