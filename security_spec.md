# Firebase Security Specification

## Data Invariants
1. A user profile cannot be created without a valid Firebase Auth UID.
2. Only an admin or a valid approver can change `isApproved` or `roles` of another user. Users cannot independently escalate their privilege (`isApproved = true` or `role = admin`).
3. Core entities (`cells`, `ministries`, `tasks`, `transactions`) MUST contain a valid `tenantId`.
4. Users restricted to one `tenantId` cannot read or write data of another `tenantId`.
5. "Tasks" in the Kanban board can only be moved (updated) by active leaders or admins.

## The "Dirty Dozen" Payloads (Edge-Cases & Attacks)
1. **Privilege Escalation Create**: User registers and sets `{ approved: true, roles: ['admin'] }`.
2. **Privilege Escalation Update**: User updates their profile with `{ roles: ['admin'] }`.
3. **Cross-Tenant Read**: User from `tenant_A` attempts a `list` query on `/cells` with `where('tenantId', '==', 'tenant_B')`.
4. **Cross-Tenant Write**: User from `tenant_A` attempts to create a task in `tenant_B`.
5. **Ghost Field Injection**: Adding `{ billingPlan: 'premium' }` to a task.
6. **Orphaned Cell Creation**: Creating a cell with a non-existent `leaderId`.
7. **Spoofing Author ID**: Creating a task with an `assigneeId` that doesn't belong to them (or without permission).
8. **Invalid Data Type**: Updating task `status` to an array instead of a string.
9. **Oversized String (Resource Poisoning)**: Setting `task.title` to a 2MB string.
10. **State Shortcutting**: Updating a task from `todo` directly to `done` without passing `in-progress` (if we enforce linear states, though Kanban usually allows this. So we'll skip linear enforcement, but ensure status must be one of `todo`, `in-progress`, `done`).
11. **PII Masking Bypass**: Accessing another user's `phone` or `birthdate` without being their leader or an admin.
12. **Denial of Wallet Query**: A raw `list` query on `/users` without limiting by `tenantId`.

## Test Runner Setup
The tests will be formalized in `firestore.rules.test.ts`.
