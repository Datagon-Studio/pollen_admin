---
version: 1
slug: "src-app-settings-staffmanagement-tsx"
primary_target: "src/app/settings/StaffManagement.tsx"
related_targets: []
---

# Staff

mode: operate

Super admins invite ops, support, and other super admins, set access by choosing a role, and revoke portal access.

## Constraints
- Preview only. The roster is sample data, with the signed-in super admin marked as you. Invite, role changes, and revoke stay in the browser until the staff API is connected.
- A role is a template for page access. Each person can turn portal pages on or off after that.
- Someone must keep the Staff page, and the last active super admin cannot be demoted or revoked.
- Invite can email a set-password link, or set a password with optional email auto-confirm. This preview does not send email or create a login.
- The route stays limited to super admins.

## Direction
Inherit the admin shell. Show the access matrix, then the roster. Invite and revoke use a dialog. A role change applies in the row and updates that person's access.
