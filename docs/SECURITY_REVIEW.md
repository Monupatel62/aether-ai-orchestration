# Security Review Checklist — aether-ai-orchestration

**Status:** design-stage checklist; not evidence of implemented controls. This file must be updated alongside code and tests.

## Trust boundary

Durable jobs and side effects

## Main threat scenarios

Duplicate delivery, crash recovery, stale events, and retries can repeat external actions or violate terminal state.

## Required controls

Assume at-least-once delivery unless proven otherwise; require idempotency keys for side effects; authenticate/validate queue envelopes; enforce monotonic state transitions, retry ceilings, leases and concurrency limits; audit approvals and cancellation races.

## Verification checklist

- [ ] Threat scenarios mapped to tests and acceptance criteria.
- [ ] Unauthorized and cross-tenant operations fail closed.
- [ ] Malformed/oversized input and output are rejected or bounded.
- [ ] Timeouts, retries, cancellation, and duplicate side effects are tested.
- [ ] Secrets and sensitive content are absent from default logs/traces.
- [ ] Dependency versions, license terms, and known vulnerabilities are reviewed.
- [ ] High-impact actions have explicit approval/policy requirements.
- [ ] Operational response and rollback are documented before production use.

## Project-wide reference

Read the [Aether AI security threat model](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/SECURITY_THREAT_MODEL.md) and [architecture audit](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/ARCHITECTURE_AUDIT.md). Use the current [OWASP GenAI Top 10 project](https://owasp.github.io/www-project-top-10-for-large-language-model-applications/) and verify the 2026 edition against the canonical publication. Do not treat prompts, tool descriptions, or UI confirmations as authorization controls.

## Change log

- 2026-10-22: Initial design-stage threat checklist added. No application code or security controls are claimed to be implemented.
