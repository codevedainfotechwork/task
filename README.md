# Task Manager

## Supabase Setup

This project now uses Supabase for:

- Postgres database storage
- admin authentication
- task attachment uploads
- company logo storage

### Required environment variables

Frontend:

- `VITE_API_URL`

Server:

- `SUPABASE_URL`
- `SUPABASE_DB_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `JWT_SECRET`

### Notes

- The app still uses custom JWT auth.
- JWT has been removed from the runtime auth flow; the app now uses opaque session tokens.
- Employee and manager login still uses the app's custom users table.
- Admin login is now backed by Supabase Auth and is kept in sync from the server bootstrap and admin user management routes.
- Task attachments and settings logos are stored in Supabase Storage.
- To move old local files into Supabase Storage, run `npm run storage:migrate-local` from `server/`.
- To reset all user passwords to temporary values and export a credential sheet, run `npm run users:temp-reset` from `server/`.
- Use [`supabase_schema.sql`](/c:/Users/LENOVO/Desktop/task%20manager%20(6)/task%20manager%20(3)/task%20manager/supabase_schema.sql) and [`supabase_seed.sql`](/c:/Users/LENOVO/Desktop/task%20manager%20(6)/task%20manager%20(3)/task%20manager/supabase_seed.sql) in the Supabase SQL editor.
- Run `npm run build` after making changes to confirm the client still compiles.

### Production Deploy

- Build the frontend with `npm run build`.
- Deploy the backend with `npm start` from `server/`.
- Set `VITE_API_URL` to your backend URL if the frontend and backend are deployed on different domains.
- Set `CORS_ORIGIN` and `FRONTEND_URL` on the backend to your production frontend URL.
- In same-origin deployments, the frontend now falls back to the current site origin instead of `localhost`.
