# Studio access

Studio is available on the website and requires a verified account with an invitation. A code is tied to one email address, expires after seven days, and is automatically disabled in the same transaction that grants membership. Used codes cannot be redeemed again, including by their original account. Existing members sign in with their account; they do not need to reuse their invitation.

| Role | Allowed actions |
| --- | --- |
| Administrator | Manage content and publication, issue invitations, and freeze, unfreeze or remove contributor/reviewer access |
| Contributor | Create and edit their own unpublished puzzles, submit for review and participate in review discussion |
| Reviewer | Inspect submitted puzzles, preview them, approve, reject or request discussion |

Reviewers cannot create or edit puzzle content, publish, delete puzzles, manage settings, issue invitations or manage members. Approval leaves a puzzle unpublished until an administrator publishes it. The review transaction checks the exact submission that was loaded, so changed submissions must be refreshed and reviewed again.

Administrators manage members under **Studio → Settings → Invite Codes**:

- **Freeze access** temporarily blocks Studio access, including writes from an existing session.
- **Unfreeze access** restores the same membership.
- **Remove from Studio** blocks Studio access until the member redeems a new invitation issued after removal. Invitations issued before removal cannot restore access.

These actions preserve the person's Firebase login, player account, saved progress and authored puzzles. Administrator accounts and the current administrator's own membership cannot be changed through these controls. Only administrators can generate invitations, including Reviewer invitations.

Permission checks are enforced by the server and Firestore rules. Membership changes are observed by open Studio sessions. The member list currently shows the newest 200 memberships and invitation history the newest 100 invitations; pagination is a follow-up for larger teams.

This change does not resolve the separate audit finding that puzzle documents, including drafts and answers, are publicly readable. Private draft/answer storage requires a coordinated content migration across the web and mobile clients.
