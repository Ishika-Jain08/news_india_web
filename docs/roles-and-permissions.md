# Roles and permissions

Authorization is enforced in `apps/api/src/middleware/auth.ts` and in the service methods under `apps/api/src/services`. Hiding a newsroom link does not grant access.

| Action | Admin | Editor | Reporter |
| --- | --- | --- | --- |
| Read published stories | yes | yes | yes |
| Create a draft | yes | yes | yes |
| Edit own draft or rejected story | yes | yes | yes |
| Edit another reporter's private draft | yes | no | no |
| Submit own draft or rejected story | yes | yes | yes |
| Approve, reject, publish, unpublish | yes | yes | no |
| Delete a published story | yes | no, unpublish first | no |
| Manage categories and breaking flags | yes | yes | no |
| Configure the YouTube desk | yes | yes | no |
| Upload media | yes | yes | yes |
| Delete another person's upload | yes | yes | no |
| Create users and change roles | yes | no | no |
| Read the audit log | yes | yes | no |
| Reset demo data | yes, and only outside production | no | no |

The status path is:

```text
draft -> submitted -> approved -> published
                  \-> rejected -> submitted
published -> approved   (unpublish)
```

Any other jump returns `409 INVALID_TRANSITION`. A reporter calling publish returns `403` before the transition is considered.

The last active admin cannot be demoted or deactivated.

Demo accounts, for local development only:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@newsindia.example | Admin@12345 |
| Editor | editor@newsindia.example | Editor@12345 |
| Reporter | reporter@newsindia.example | Reporter@12345 |

Passwords are stored as bcrypt hashes. The login response sets an HTTP-only `ni.sid` cookie. Mutating requests must send the `X-CSRF-Token` value from `GET /api/v1/auth/csrf` or from the login response. Login itself is exempt and is rate-limited.
