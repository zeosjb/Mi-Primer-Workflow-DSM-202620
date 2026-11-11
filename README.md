# Tutorial paso a paso: de cero a CI/CD con Next.js, Docker y GitHub Actions

Construimos **Rockdex** desde un directorio vacío y le agregamos, una capa por vez, todo lo que hace falta para ver DevOps funcionando: tests, un pipeline de CI, contenedores y entrega continua.

## Mapa del recorrido

```
Parte 1  Preparar el entorno
Parte 2  Crear la app                       ← código
Parte 3  Tests unitarios (Vitest)           ← calidad local
Parte 4  Tests E2E (Playwright)
Parte 5  Subir a GitHub
Parte 6  CI con GitHub Actions              ← aquí aparece DevOps
Parte 7  Proteger main + flujo de PR
Parte 8  Docker                             ← empaquetar
Parte 9  CD: publicar la imagen             ← entrega continua
Parte 10 Dependabot y demos para clase
```

**Qué es CI/CD en una frase**

- **CI (Integración Continua):** cada cambio se valida automáticamente (lint, tipos, tests, build) antes de entrar a `main`.
- **CD (Entrega/Despliegue Continuo):** lo que ya está validado se empaqueta y se publica/despliega automáticamente.

---

## Parte 1. Preparar el entorno

### 1.1 Instalar herramientas

| Herramienta | Descarga | Verificar |
|---|---|---|
| Node.js 24 | https://nodejs.org | `node -v` |
| Git | https://git-scm.com | `git --version` |
| Docker Desktop | https://www.docker.com/products/docker-desktop | `docker --version` |
| GitHub CLI (opcional) | https://cli.github.com | `gh --version` |
| Editor (VS Code) | https://code.visualstudio.com | — |

**Verificá:** los cuatro comandos imprimen una versión. Para Docker, abrí Docker Desktop y esperá a que diga "Engine running".

### 1.2 Configurar Git (una sola vez)

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
git config --global init.defaultBranch main
```

### 1.3 Cuenta de GitHub
Cada estudiante necesita su cuenta en https://github.com. Si usan `gh`: `gh auth login`.

---

## Parte 2. Crear la app

### 2.1 Generar el proyecto

```bash
npx create-next-app@latest rockdex --ts --eslint --tailwind --app --src-dir --use-npm --import-alias "@/*"
cd rockdex
```

> Si el asistente pregunta algo más (por ejemplo, React Compiler), aceptá los valores por defecto.

### 2.2 Probarla

```bash
npm run dev
```

Abrí http://localhost:3000. **Verificá:** se ve la página de bienvenida de Next.js. Cortá con `Ctrl+C`.

### 2.3 Reemplazar la plantilla por contenido propio

Reemplazá `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
        Descubre el mundo de las rocas
      </h1>
      <p className="max-w-md text-lg text-zinc-600">
        Rockdex es tu catálogo para explorar, identificar y registrar rocas.
      </p>
      <Link href="/privacidad" className="font-medium underline">
        Política de privacidad
      </Link>
    </main>
  );
}
```

Creá `src/app/privacidad/page.tsx`:

```tsx
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        Política de privacidad
      </h1>
      <p className="leading-7 text-zinc-600">
        Rockdex es un proyecto educativo. No recopilamos ni almacenamos datos
        personales de las personas que visitan este sitio.
      </p>
      <Link href="/" className="font-medium underline">
        Volver al inicio
      </Link>
    </main>
  );
}
```

En `src/app/layout.tsx` cambiá `lang="en"` por `lang="es"` y el `metadata` por `title: "Rockdex"`.

### 2.4 Lógica de negocio (para tener algo que testear)

Creá `src/lib/rockdex.ts`:

```ts
export function validateRockName(name: string): boolean {
  return name.trim().length >= 3;
}
```

### 2.5 Activar el modo "standalone" (lo necesita Docker)

Editá `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

> **Por qué:** `standalone` genera un servidor mínimo con solo lo necesario. La imagen Docker queda mucho más chica.

### 2.6 Verificar

```bash
npm run build
```

**Verificá:** la tabla de rutas muestra `/` y `/privacidad`, y existe la carpeta `.next/standalone`.

---

## Parte 3. Calidad local: tests unitarios

### 3.1 Instalar Vitest y utilidades

```bash
npm i -D vitest @vitest/coverage-v8 jsdom @vitejs/plugin-react vite-tsconfig-paths @testing-library/react @testing-library/dom @testing-library/jest-dom
```

### 3.2 Configurar

Creá **`vitest.config.ts`** (cuidado con el nombre exacto: un typo como `vitest.confing.ts` hace que Vitest lo ignore en silencio, y eso ya nos rompió el CI una vez):

```ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
```

Creá **`vitest.setup.ts`**:

```ts
import "@testing-library/jest-dom/vitest";
```

> La línea `exclude: ["e2e/**"]` es clave: los tests E2E de la Parte 4 usan otro runner (Playwright) y Vitest no debe intentar ejecutarlos.

### 3.3 Escribir el test

Creá `src/lib/rockdex.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateRockName } from "./rockdex";

describe("validateRockName", () => {
  it("acepta nombres válidos", () => {
    expect(validateRockName("Granito")).toBe(true);
  });

  it("rechaza nombres vacíos", () => {
    expect(validateRockName("")).toBe(false);
  });

  it("rechaza nombres de menos de 3 caracteres", () => {
    expect(validateRockName("AB")).toBe(false);
  });

  it("ignora espacios al validar", () => {
    expect(validateRockName("  ")).toBe(false);
  });
});
```

### 3.4 Agregar scripts a `package.json`

Dentro de `"scripts"` dejá (agregando los que falten):

```json
"lint": "eslint .",
"typecheck": "next typegen && tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test"
```

### 3.5 Ejecutar los checks

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
```

**Verificá:** los cuatro terminan sin errores; `test` muestra `4 passed`.

### 3.6 Ignorar carpetas generadas

Agregá a `.gitignore`:

```
/coverage
/playwright-report/
/test-results/
```

Y en `eslint.config.mjs`, dentro de `globalIgnores([...])`, sumá `"coverage/**"`, `"playwright-report/**"` y `"test-results/**"`.

> **Por qué:** sin esto, `eslint .` analiza los reportes generados y devuelve warnings que nadie escribió.

---

## Parte 4. Tests E2E con Playwright

Los E2E abren un navegador real y comprueban lo que ve un usuario.

### 4.1 Instalar

```bash
npm i -D @playwright/test
npx playwright install chromium
```

### 4.2 Configurar

Creá `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

> Playwright levanta la app por su cuenta con `npm run start`, así que hay que haber hecho `npm run build` antes. Con `output: "standalone"`, Next muestra una advertencia al usar `next start`; el test funciona igual.

### 4.3 Escribir los tests

Creá `e2e/landing.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("la landing de Rockdex funciona", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /descubre el mundo de las rocas/i }),
  ).toBeVisible();
});

test("permite navegar a privacidad", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /política de privacidad/i }).click();
  await expect(page).toHaveURL(/\/privacidad/);
  await expect(
    page.getByRole("heading", { name: /política de privacidad/i }),
  ).toBeVisible();
});
```

### 4.4 Ejecutar

```bash
npm run build
npm run test:e2e
```

**Verificá:** `2 passed`. Para ver el reporte: `npx playwright show-report`.

---

## Parte 5. Subir a GitHub

### 5.1 Primer commit

`create-next-app` ya inicializó Git. Revisá y commiteá:

```bash
git status
git add .
git commit -m "feat: initial rockdex app with unit and e2e tests"
```

> Usamos **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`.

### 5.2 Crear el repositorio y subir

Con GitHub CLI:

```bash
gh repo create rockdex --public --source=. --remote=origin --push
```

O manualmente: creá un repo vacío en github.com, y luego:

```bash
git remote add origin https://github.com/TU_USUARIO/rockdex.git
git push -u origin main
```

**Verificá:** el código aparece en GitHub.

> Nunca subas secretos: `.env*` ya está ignorado por `.gitignore` (excepto `.env.example`).

---

## Parte 6. CI con GitHub Actions

### 6.1 Cómo funciona

Un **workflow** es un archivo YAML en `.github/workflows/`. GitHub lo ejecuta en una máquina virtual limpia cada vez que ocurre un **evento** (push, pull request…). Cada **job** tiene **steps**; si un step falla, el job falla y el check queda en rojo.

### 6.2 Trabajar en una rama

```bash
git switch -c ci/add-pipeline
```

### 6.3 Crear el workflow

Creá `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v7

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - name: Install Dependencies
        run: npm ci

      - name: ESLint
        run: npm run lint

      - name: TypeScript
        run: npm run typecheck

      - name: Unit Tests
        run: npm run test

      - name: Dependency Audit
        run: npm audit --audit-level=high

      - name: Production Build
        run: npm run build

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: quality

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v7

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - name: Install Dependencies
        run: npm ci

      - name: Install Playwright Browser
        run: npx playwright install --with-deps chromium

      - name: Production Build
        run: npm run build

      - name: Run E2E Tests
        run: npm run test:e2e

      - name: Upload Playwright Report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  docker:
    name: Docker Build
    runs-on: ubuntu-latest
    needs: quality

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v7

      - name: Build Docker Image
        run: docker build -t rockdex:ci .
```

> El job `docker` necesita el `Dockerfile` de la Parte 8. Si querés ir en orden en clase, **dejá ese job comentado** hasta llegar allí.

Puntos para explicar en voz alta:

| Línea | Qué hace |
|---|---|
| `on: push / pull_request` | Cuándo se dispara |
| `permissions: contents: read` | Mínimo privilegio para el token del workflow |
| `cache: npm` | Reutiliza descargas entre ejecuciones |
| `npm ci` | Instala exactamente lo del `package-lock.json` (reproducible) |
| `needs: quality` | `e2e` y `docker` solo corren si `quality` pasó (**fail fast**: lo barato primero) |
| `if: ${{ !cancelled() }}` | Sube el reporte aunque los tests fallen |

### 6.4 Subir y abrir el PR

```bash
git add .github
git commit -m "ci: add quality, e2e and docker jobs"
git push -u origin ci/add-pipeline
gh pr create --base main --fill
```

### 6.5 Mirar el pipeline

En GitHub: pestaña **Actions** (o los checks al final del PR). Hacé clic en un job para ver cada step y sus logs.

**Verificá:** `Quality Checks` en verde con tilde.

> **Si el PR no muestra checks:** abrí la pestaña *Conversation*. Si dice "This branch has conflicts", GitHub **no ejecuta** workflows hasta resolverlos (traer `main` a la rama con `git merge origin/main`).

---

## Parte 7. Proteger `main` y flujo de trabajo

### 7.1 Exigir que el CI pase

En GitHub: **Settings → Branches → Add branch ruleset** (o *Branch protection rule*) para `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass → seleccioná `Quality Checks` (y `E2E Tests`)
- ✅ Require branches to be up to date before merging

> Los nombres de checks solo aparecen en la lista después de haberse ejecutado al menos una vez.

### 7.2 El flujo que se repite siempre

```
rama → commits → push → PR → CI automático → revisión → merge → (CD)
```

**Verificá:** el botón de merge del PR queda bloqueado mientras el CI esté rojo o pendiente.

---

## Parte 8. Docker

### 8.1 El Dockerfile (3 etapas)

Creá `Dockerfile`:

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

| Etapa | Para qué |
|---|---|
| `deps` | Instala dependencias; se cachea si `package*.json` no cambió |
| `builder` | Compila la app |
| `runner` | Imagen final mínima, **sin root**, solo con el resultado del build |

Creá `.dockerignore`:

```
node_modules
.next
.git
.github
coverage
playwright-report
test-results
.env
.env.*
*.log
```

> **Por qué:** sin `.dockerignore` se copian `node_modules` y secretos al contexto de build (lento e inseguro).

### 8.2 Construir y correr

```bash
docker build -t rockdex .
docker run --rm -p 3000:3000 rockdex
```

**Verificá:** http://localhost:3000 muestra la landing, ahora corriendo **dentro de un contenedor**. Cortá con `Ctrl+C`.

Comandos útiles para mostrar:

```bash
docker images rockdex        # tamaño de la imagen
docker ps                    # contenedores en ejecución
docker logs <id>             # logs
docker stop <id>
```

### 8.3 Docker Compose

Creá `docker-compose.yml`:

```yaml
services:
  rockdex:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - path: .env.local
        required: false
    restart: unless-stopped
```

```bash
docker compose up --build -d
docker compose logs -f
docker compose down
```

> `required: false` evita que Compose falle si no existe `.env.local`.

### 8.4 Variables de entorno

- Creá `.env.example` con **nombres de variables sin valores reales** (se versiona).
- Cada persona copia `cp .env.example .env.local` con sus valores (**no** se versiona).
- En CI/producción se usan **GitHub Secrets**, nunca archivos.

### 8.5 Subir los cambios

```bash
git switch -c feat/docker
git add Dockerfile .dockerignore docker-compose.yml
git commit -m "feat: containerize app with docker multi-stage build"
git push -u origin feat/docker
gh pr create --base main --fill
```

**Verificá:** en el PR corre el job `Docker Build` y queda en verde.

---

## Parte 9. CD: publicar la imagen automáticamente

CI valida. **CD entrega.** Vamos a publicar la imagen en **GitHub Container Registry (GHCR)** cada vez que algo entra a `main`.

> Esta parte es una extensión para clase: usa acciones oficiales de Docker y **no está ejecutada en el repo de referencia**. Probala antes de la clase con tu propio repositorio.

### 9.1 Workflow de publicación

Creá `.github/workflows/cd.yml`:

```yaml
name: CD

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  publish:
    name: Publish Docker Image
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v7

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Image Metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha
            type=raw,value=latest

      - name: Build and Push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

Conceptos:

- `packages: write`: permiso mínimo para publicar en GHCR.
- `secrets.GITHUB_TOKEN`: GitHub lo genera solo en cada ejecución; no hay que crear nada.
- Cada imagen queda etiquetada con el **SHA del commit** (trazabilidad: sabés exactamente qué código corre) y con `latest`.

> Si las versiones de estas actions cambiaron, usá la última mayor; Dependabot (Parte 10) las mantiene al día.

### 9.2 Probarlo

1. Mergeá el PR a `main`.
2. Pestaña **Actions** → workflow **CD** en verde.
3. En el perfil o repo, pestaña **Packages**: aparece `rockdex`.
4. Si el repo es público y querés que cualquiera la descargue, en la página del paquete: **Package settings → Change visibility → Public**.

### 9.3 Usar la imagen publicada

```bash
docker pull ghcr.io/TU_USUARIO/rockdex:latest
docker run --rm -p 3000:3000 ghcr.io/TU_USUARIO/rockdex:latest
```

**Verificá:** la app corre desde una imagen construida y publicada por el pipeline, sin que nadie la haya compilado a mano.

### 9.4 Desplegar (siguiente paso, opcional)

Con la imagen en un registro, desplegar es "traer y arrancar":

- **Servidor propio / VPS:** `docker compose pull && docker compose up -d`
- **PaaS con soporte de imágenes:** Render, Fly.io, Railway, Azure Container Apps…
- Agregá un *health check* y monitoreo (uptime, logs, alertas) para cerrar el ciclo.

---

## Parte 10. Dependabot y demos para clase

### 10.1 Dependabot: actualizaciones automáticas

Creá `.github/dependabot.yml`:

```yaml
version: 2

updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

Cada semana Dependabot abre PRs de actualización, y **cada PR pasa por el mismo CI**. Así se ve el valor del pipeline: una actualización se acepta o se rechaza por evidencia, no por fe.

> Demo real: si un bump rompe algo (por ejemplo, un cambio mayor de TypeScript), el PR queda en rojo y no se mergea.

### 10.2 Demo A: romper el CI a propósito

1. Rama: `git switch -c demo/ci-rojo`
2. En `src/lib/rockdex.ts` cambiá `>= 3` por `>= 5`.
3. `git commit -am "fix: demo broken validation"` y `git push -u origin demo/ci-rojo`, abrí el PR.
4. **Resultado:** `Quality Checks` en rojo en el paso **Unit Tests**; el merge queda bloqueado y `E2E`/`Docker` ni se ejecutan (`needs`).
5. Corregí el valor, volvé a pushear: el pipeline se re-ejecuta solo y pasa a verde.

**Lección:** el CI atrapó el error **antes** de llegar a `main`.

### 10.3 Demo B: error de tipos / lint

Agregá `const x: number = "hola";` en cualquier archivo `.ts`. Falla `TypeScript` (y también puede fallar `ESLint`). Mismo flujo.

### 10.4 Demo C: el E2E detecta lo que el unitario no

Cambiá el `<h1>` de la landing a otro texto. Los unitarios pasan, pero **`E2E Tests` falla**. Descargá el artefacto `playwright-report` desde la pestaña Actions y mostrá el reporte con la traza.

### 10.5 Demo D: el flujo completo feliz

Cambio chico válido → PR → todo verde → merge → el workflow **CD** publica una nueva imagen con el SHA del commit.

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `npm run test` falla con "Playwright Test did not expect test() to be called here" | Falta `exclude: ["e2e/**"]` o el archivo de config está mal nombrado | Revisar el nombre exacto `vitest.config.ts` |
| `docker build` o `docker run` dicen "cannot connect to the Docker API" | Docker Desktop apagado | Abrir Docker Desktop y esperar al motor |
| El PR no muestra checks de CI | Conflictos con `main` | `git fetch && git merge origin/main`, resolver, pushear |
| `npm ci` falla en CI pero `npm install` funciona local | `package.json` y `package-lock.json` desincronizados | Correr `npm install` y commitear el lock |
| E2E falla en CI con "Executable doesn't exist" | Faltó instalar el navegador | Paso `npx playwright install --with-deps chromium` |
| `docker compose up` falla por `.env.local` | Archivo inexistente | `required: false` o `cp .env.example .env.local` |
| Aviso `"next start" does not work with "output: standalone"` | Esperado con standalone | Ignorable en esta práctica; en producción se usa `node server.js` |
| Mensajes `LF will be replaced by CRLF` (Windows) | Fin de línea de Git en Windows | Normal; se puede silenciar con un `.gitattributes` |
| `npm audit` reporta vulnerabilidades moderadas | Dependencias de desarrollo | El CI solo bloquea `high`/`critical`; revisar con Dependabot |

---

## Checklist final del curso

- [ ] La app corre con `npm run dev`
- [ ] `lint`, `typecheck`, `test`, `test:coverage` pasan en local
- [ ] `test:e2e` pasa en local
- [ ] El repo está en GitHub y `main` está protegida
- [ ] El CI corre en cada PR y bloquea el merge si falla
- [ ] `docker run` sirve la app en el puerto 3000
- [ ] El workflow CD publica la imagen en GHCR al hacer merge
- [ ] Dependabot abre PRs semanales
- [ ] Rompimos el CI a propósito y lo arreglamos (Demo A)

## Resumen en una imagen

```
 Desarrollador                GitHub                          Registro / Servidor
 ─────────────          ─────────────────────          ─────────────────────────────
 rama + commits  ──push──▶  Pull Request
                              │
                              ▼   CI (automático)
                          lint → tipos → tests → audit → build
                              │       └─▶ E2E   └─▶ docker build
                              ▼
                          revisión + merge a main
                              │
                              ▼   CD (automático)
                          build de imagen ──────────▶  ghcr.io/usuario/rockdex:<sha>
                                                              │
                                                              ▼
                                                      docker pull && run  (deploy)
```
