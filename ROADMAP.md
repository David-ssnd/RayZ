# RayZ Project Setup & Roadmap

## 1️⃣ Project Overview

RayZ is a **multi-platform project** consisting of:

* **ESP32 firmware** for weapon and target modules
* **Next.js monorepo** for web frontend + backend
* **Database** with PostgreSQL (Neon) using Prisma ORM
* **Automated CI/CD, code quality, and deployment**

The project uses **semantic versioning** and modern development practices to ensure reproducibility and collaboration.

---

## 2️⃣ Folder Structure (Monorepo + Embedded)

```
RayZ/
├─ esp32/
│  ├─ weapon/      # PlatformIO project for weapon module (repo)
│  └─ target/      # PlatformIO project for target module (repo)
├─ web/            # Next.js monorepo (Turborepo)
├─ .github/
│  └─ workflows/     # GitHub Actions CI/CD pipelines
├─ .pre-commit-config.yaml  # pre-commit hooks
├─ .clang-format           # C++ style rules
├─ .clang-tidy             # C++ static analysis config
├─ package.json            # Monorepo root package.json
├─ README.md
└─ ROADMAP.md
```

---

## 3️⃣ Tech Stack Summary

| Layer                | Technology                                | Notes                                         |
| -------------------- | ----------------------------------------- | --------------------------------------------- |
| Embedded             | C++ / ESP32 / PlatformIO                  | Existing VSCode + PlatformIO setup            |
| Embedded CI/Quality  | clang-format, clang-tidy, Unity Test      | Unit testing and static analysis              |
| Web Framework        | Next.js 14+ with Turborepo                | Monorepo for frontend + backend               |
| Web Styling          | TailwindCSS, shadcn/ui                    | Consistent UI, reusable components            |
| Web Backend          | Next.js API routes / tRPC                 | Type-safe APIs                                |
| Database             | PostgreSQL (Neon) + Prisma                | Cloud-first DB, migrations, type-safe queries |
| Web Testing          | Jest (unit/integration), Playwright (e2e) | Full test coverage                            |
| Linting & Formatting | ESLint + Prettier                         | Consistent code style                         |
| Version Control      | Git, Semantic Versioning                  | Submodules for embedded, monorepo for web     |
| CI/CD                | GitHub Actions                            | Automated builds, tests, and deploy to Vercel |
| Offline Development  | PlatformIO & Node.js offline caching      | ESP32 and web dev without internet            |

---

## 4️⃣ Next Steps (Setup & Development)

### **4.1 ESP32 Firmware**

1. Ensure **PlatformIO** projects are properly structured (`esp32/weapon` and `esp32/target`)
2. Configure **clang-format** and **clang-tidy**
3. Set up **unit tests** with Unity Test framework
4. Add **pre-commit hooks**:

   * Auto-format on commit
   * Lint + static analysis
   * Run unit tests

### **4.2 Web Monorepo (Next.js + Turborepo)**

1. Convert previous `web/frontend` + `web/backend` into **monorepo**:

   * `apps/frontend`
   * `apps/backend`
   * `packages/ui` for shared UI components (shadcn/ui)
   * `packages/types` for shared TypeScript types
2. Setup **ESLint + Prettier + Husky + pre-commit** hooks
3. Setup **Prisma + Neon PostgreSQL** for backend
4. Add **unit tests** (Jest) and **e2e tests** (Playwright)
5. Configure **Vercel deployment** on `main` branch

### **4.3 CI/CD & Automation**

1. GitHub Actions workflows:

   * **ESP32**: build + test + static analysis
   * **Web**: lint + test + build + deploy
2. Semantic versioning: tag firmware & web releases separately (`1.0.0`, `1.1.0`, `1.2.0`)
3. Automate **submodule updates** and **monorepo dependencies**
4. Optionally, setup **Docker dev container** for fully reproducible environment

### **4.4 Offline Development**

* Use **PlatformIO offline mode** for ESP32
* Use **Node.js + Turborepo caching** for web apps
* Make sure **npm/pnpm/yarn lockfiles** are included
* Include **VSCode dev container** for collaborators

---

## 5️⃣ Guidelines for Collaborators

1. Clone the repo **with submodules**:

```bash
git clone --recurse-submodules <repo-url>
```

2. Install dependencies for web monorepo:

```bash
cd web
pnpm install  # or npm/yarn
```

3. Open **VSCode** and use **recommended extensions**:

   * PlatformIO
   * ESLint
   * Prettier
   * TailwindCSS IntelliSense

4. Run **tests before pushing** (via pre-commit hooks or manually)

5. Follow **semantic versioning** for releases

---

## 6️⃣ Future Improvements

* Automated firmware OTA updates via ESP32
* Shared TypeScript types between frontend and backend
* Automated code coverage reporting
* Dockerized CI/CD for offline reproducible builds