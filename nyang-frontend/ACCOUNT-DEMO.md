# Two-account demonstration

The existing cat UI now uses `/api/account`. Login types are employee (`user01`) and staff (`admin01`). The common demo password is configured as the server-only `NYANG_DEMO_PASSWORD_HASH` secret, in `salt:PBKDF2-SHA256` format with 100,000 iterations. Never place it in public files. Local development uses ignored `.dev.vars`; production uses Sites environment settings.

Each account has a stable server identity. Points, levels, attendance, treat tokens, hearts and outfits are in D1 and carry across independent login sessions. Polling refreshes rewards every 15 seconds while the page is visible and idle, and when it regains focus. Login sessions last 24 hours. Logout revokes that session; other devices remain signed in. Login validates the selected role and rate limits attempts. Account APIs authorize all operations on the server, use HttpOnly cookies and same-origin POST checks, and never accept a client-provided user ID or role as authority.

Demo data is isolated in `demo_*` tables. Previous visitor records and the existing authenticated company workspace are unchanged. Both demo accounts are shared credentials: they demonstrate account behavior, not individual employee identity or production confidentiality. The staff account opens a dedicated workspace with only board management and statistics. It can answer, soft-delete and restore board posts, but cannot ask chat questions, post questions, like, earn rewards, or manage users. These restrictions are enforced by the server. Staff replies include the server-verified username and department; question authors remain anonymous. No question text is included in the statistics response.

Statistics show employee rewarded unique questions, active board question/answer counts, employee attendance, seven days of employee rewarded questions, active board categories, and employee point balance ranking. Deleted posts and their replies/likes are hidden from employees and excluded from board statistics. Staff can restore them from Deleted posts; previously awarded points are retained. They do not measure all chat turns or lifetime earned points. Dates use Asia/Seoul. Production starts empty and does not include local QA data.

Question history, saved answers, documents and schedules remain browser-local, now namespaced by account to avoid accidental display when accounts are switched. They do not sync between devices. Theme/background preferences remain device-local. Logs and passwords are not stored in browser localStorage.

Before actual employee deployment, replace the two demo credentials with individual identities and approved authentication, preserve server-side authorization, and review data hosting with the company. Qwen is not connected in this update.

Validation: `npm run check`. D1 migrations must be applied locally for browser testing and are applied by Sites during deployment.
