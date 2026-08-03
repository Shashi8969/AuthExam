# AuthExam

A workforce management platform for field operators: onboarding, ID
verification, service-center assignment, invoicing, notices, and a
role-based approval workflow for admins and supervisors.

Built with React 18, React Router, and Firebase (Authentication, Realtime
Database, Storage), bundled with Vite.

## Features

- **Operator onboarding** &mdash; add field operators with photo ID capture and
  cropping, phone/Aadhaar validation, and reusable reference names.
- **Center assignment** &mdash; assign operators to service centers and save
  assignment lists for reuse (with Excel export).
- **Invoicing** &mdash; create, template, and track invoices tied to assignments.
- **Notices/Blog** &mdash; publish public notices; managed by admins.
- **Approvals** &mdash; supervisor-submitted changes require admin approval
  before they take effect.
- **Role-based access** &mdash; separate Admin, Supervisor, and member roles,
  enforced both in the UI and in Firebase security rules.
- **Dedicated admin sign-in** &mdash; admins authenticate through `/admin/login`,
  a route kept separate from the public member login/signup flow.

## Tech Stack

- [React 18](https://react.dev/) + [React Router 7](https://reactrouter.com/)
- [Vite](https://vitejs.dev/) for dev server and bundling
- [Firebase](https://firebase.google.com/) (Auth, Realtime Database, Storage)
- [react-icons](https://react-icons.github.io/react-icons/), [react-image-crop](https://github.com/DominicTobias/react-image-crop)
- [SheetJS (xlsx)](https://sheetjs.com/) for spreadsheet export

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Authentication (Email/Password), Realtime Database,
  and Storage enabled

### Setup

```bash
git clone <this-repo-url>
cd AuthExam
npm install
```

Copy `.env.example` to `.env` and fill in your Firebase project's web app
credentials (Firebase Console > Project Settings > General > Your apps):

```bash
cp .env.example .env
```

Run the dev server:

```bash
npm start
```

The app runs at `http://localhost:3000`.

### Build

```bash
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

## Roles & Access

| Role       | How it's granted                                   | Access |
|------------|-----------------------------------------------------|--------|
| Admin      | A record under `Admin/{uid}` in the Realtime Database | Full access: manage operators, centers, references, invoices, blog/notices, and approve supervisor changes. Signs in at `/admin/login`. |
| Supervisor | A record under `Supervisors/{uid}`, or auto-detected by matching phone number to an operator record | Can manage their own operators/centers/references; edits to existing records route through admin approval. |
| Member     | Any signed-up account (`/signup`)                   | Can view public pages (Home, Notices) and their own profile. |

Admins and members both sign in with Firebase Email/Password auth, but through
separate routes and separate forms: `/admin/login` for admins and `/login`
for everyone else. Route protection is enforced with `ProtectedRoute`
(`adminOnly` prop for admin-only pages), and mirrored server-side in
`database.rules.json` and `storage.rules` so the UI checks are a UX
convenience, not the security boundary.

## Security Notes

- All Firebase credentials are read from environment variables
  (`VITE_FIREBASE_*`); none are hardcoded in source. See `.env.example`.
- `database.rules.json` enforces per-node, per-role read/write access and
  data validation; it is the actual authorization boundary, independent of
  any client-side role checks.
- `storage.rules` restricts image uploads to authenticated users, image
  content types, and a 5 MB size limit. Known limitation: Storage rules
  cannot query the Realtime Database, so they can't yet distinguish
  Admin/Supervisor from a plain member account for write access to a given
  employee's images. Closing that gap requires either mirroring the `Admin`
  set into Firestore (queryable from Storage rules) or issuing
  `isAdmin`/`isSupervisor` as Firebase Auth custom claims from a trusted
  backend (e.g. a Cloud Function), then checking `request.auth.token` in
  `storage.rules`.
- Do not commit a real `.env` file, service account keys, or any Firebase
  Admin SDK credentials to this repository.
- `react-router-dom` is pinned to `^7.18.1`, which fixes every published
  advisory except one high-severity CSRF issue scoped to React Router's RSC
  ("framework mode") server actions
  ([GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)),
  not yet patched in any 7.x/8.x release. This app only uses classic
  client-side routing (`BrowserRouter`, `Routes`, `Link`, `useNavigate`) and
  never enables RSC/framework mode, so that advisory's attack surface isn't
  reachable here. Re-check `npm audit` when upgrading this package.

## Project Structure

```
src/
  components/     # Feature components (EmployeeForm, EmployeeList, Invoices, Blog, ...)
  config/         # Firebase initialization (src/config/firebase.js)
  context/        # AuthContext (current user, role detection)
  hooks/          # Shared hooks
  models/         # Data models
  pages/          # Standalone pages (404, please-login)
public/           # Static assets, robots.txt, sitemap.xml, manifest.json
database.rules.json  # Realtime Database security rules
storage.rules        # Firebase Storage security rules
firebase.json         # Firebase Hosting/Database/Storage config
```

## Deployment

The app is hosted on [Vercel](https://vercel.com) at
**[authexam.vercel.app](https://authexam.vercel.app)** as a static Vite build
(`npm run build` producing `dist/`, auto-detected by Vercel's build system).

Firebase is used only for backend services (Authentication, Realtime
Database, Storage) — not for hosting. Database and Storage security rules
are deployed straight to those services, independent of where the frontend
is hosted:

```bash
firebase deploy --only database,storage
```

The default Firebase project is set in `.firebaserc`. `firebase.json` also
contains a `hosting` block (cache headers, rewrites) kept for local preview
via `firebase serve`/`firebase deploy --only hosting`, but production
traffic is served by Vercel, so keep `authexam.vercel.app` (referenced in
`index.html`, `robots.txt`, and `sitemap.xml`) in sync if that domain ever
changes.
