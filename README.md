# AI Game Hero Design Assistant

AI Game Hero Design Assistant is a desktop tool for designing game heroes with AI assistance. It combines a FastAPI backend, an Electron + React desktop frontend, project save/export workflows, VFX concept generation, image generation, and a playable 3D demo pipeline.

The project is mainly built for Chinese user-facing workflows. Code, schemas, and technical names use English where practical.

## Main Features

- Generate structured game hero design proposals.
- Break hero skills into VFX design descriptions.
- Generate image prompts for skill VFX thumbnails.
- Generate skill VFX preview images through fake, OpenAI, or OpenAI-compatible image providers.
- Render a VFX design board image from hero, VFX, prompt, and generated asset data.
- Save and reopen local project records.
- Export project packages as ZIP files.
- Generate and validate `HeroPlayableSpec` configuration.
- Run a minimal Playtest scene with a fixed training map, Game Core, Skill System, and Three.js renderer.

## Project Structure

```text
backend/                 FastAPI backend
  app/api/               API routes
  app/clients/           LLM and image clients
  app/prompts/           Prompt builders
  app/renderers/         Board rendering logic
  app/schemas/           Pydantic schemas
  app/services/          Business services
  app/storage/           File and project storage helpers
  tests/                 Pytest suite

desktop/                 Electron desktop frontend
  electron/              Electron main/preload files
  src/api/               Frontend API wrappers
  src/components/        UI components
  src/game-demo/         Playable Demo runtime modules
  src/pages/             Main app page
  tests/                 Vitest suite

docs/playable/           HeroPlayableSpec protocol docs
demo/                    Demo assets
```

## Backend

The backend provides:

- `/api/hero/generate`
- `/api/vfx/breakdown-batch`
- `/api/image-prompts/generate-batch`
- `/api/images/generate`
- `/api/images/generate-batch`
- `/api/boards/render`
- `/api/projects/*`
- `/api/playable/generate`
- `/api/playable/validate`
- `/api/files/*`

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` as needed. Do not commit `.env`.

For local fake-mode development:

```env
LLM_PROVIDER=fake
IMAGE_PROVIDER=fake
```

For OpenAI-compatible image providers, use a base URL ending at `/v1`, not the full endpoint:

```env
IMAGE_PROVIDER=openai_compatible
IMAGE_API_KEY=your-api-key
IMAGE_BASE_URL=https://your-provider.example/v1
IMAGE_MODEL=gpt-image-2
```

Run the backend:

```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run backend tests:

```bash
cd backend
python -m pytest
```

## Desktop

The desktop app provides:

- Generate view for hero creation.
- Blueprint view for hero and VFX breakdown review.
- Assets view for prompts, images, and VFX board preview.
- Projects view for local history.
- Export view for ZIP package export.
- Playtest view for the playable demo.

### Desktop Setup

```bash
cd desktop
npm install
npm run electron:dev
```

Run desktop tests:

```bash
cd desktop
npm run test
```

Build desktop assets:

```bash
cd desktop
npm run build
```

## One-Command Development Start

On Windows, from the repository root:

```powershell
.\start-dev.ps1
```

This opens separate backend and Electron desktop development windows.

## Playable Demo

The Playable Demo pipeline is based on `HeroPlayableSpec v1`.

Important rules:

- AI generates structured JSON configuration, not executable game code.
- Runtime code never executes scripts from generated data.
- Backend validates generated specs with Pydantic.
- Desktop validates and normalizes specs again before runtime use.
- Unknown fields should be ignored or logged, not executed.

Reference files:

- `docs/playable/HeroPlayableSpec.v1.md`
- `docs/playable/HeroPlayableSpec.example.json`
- `backend/app/schemas/playable_schema.py`
- `desktop/src/game-demo/specs/playableSpecSchema.ts`

## Export Package

Project export can include:

- Project JSON.
- Markdown design document.
- Skill VFX images.
- VFX design board.
- Playable package files:
  - `playable/README.md`
  - `playable/hero_playable_spec.json`
  - `playable/default_training_map.json`

## Security Notes

- `backend/.env` is ignored and must not be committed.
- Use `backend/.env.example` as the public configuration template.
- Generated files under `backend/outputs/` are ignored.
- Frontend dependencies and build outputs are ignored.
- Playable runtime must not execute `eval`, `Function`, remote code, or arbitrary scripts from generated JSON.

## Current Status

The project has a working end-to-end MVP for:

- AI hero design generation.
- VFX prompt and image workflows.
- Project save/history/export.
- HeroPlayableSpec generation and validation.
- Minimal playable 3D Playtest scene.

The image generation path supports OpenAI-compatible providers, but third-party provider stability and supported model parameters may vary.
