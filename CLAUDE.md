# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mIoTree is a Django web application that visualizes IoT malware family genealogies as an interactive D3.js tree diagram with a timeline view. It tracks ~100 malware families with parent-child relationships, activity periods, and metadata.

## Commands

### Local Development
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Docker
```bash
docker-compose up -d    # runs migrations and starts server on port 8000
```

### Django Management
```bash
python manage.py makemigrations    # after model changes
python manage.py migrate
python manage.py createsuperuser   # for admin access at /admin/
```

There are no tests, linting, or formatting commands configured.

## Architecture

### Django Structure
- **`miotree/`** — Django project package (settings, root URL config, WSGI/ASGI)
- **`polls/`** — The single Django app containing all application code
- Database: SQLite (`miotree.sqlite3`)

### Data Flow
1. `polls/views.py::index()` fetches all `Family` objects, serializes to JSON, processes parent IDs from comma-separated strings into arrays, sorts by `first_seen` date
2. JSON data is passed to `polls/templates/index.html` as an escaped template variable
3. `polls/static/miotree/js/miotree.js` (622 lines) parses the JSON and renders an interactive D3.js v7 tree visualization with a timeline x-axis (2007–2024)

### Data Model
Single model `Family` in `polls/models.py`:
- `name`, `alias`, `first_seen` (YYYY-MM), `last_seen` (YYYY-MM nullable)
- `parents` — comma-separated IDs (e.g. "18,9,16"), not a foreign key relation
- `bot_size`, `open_source`, `white_malware` (boolean flags)
- `informations` — JSONField storing: childs, cpu architectures, topology, code_similarity, category, attack types, info, urls
- Date validation restricts years to 2007–current year

### Frontend
- D3.js v7 for tree/timeline visualization
- Fomantic-UI 2.9.2 for layout/styling
- jQuery, Moment.js loaded from CDN
- `polls/static/miotree.css` for custom styles
- `polls/templates/base.html` provides the layout shell

### Admin Interface
`polls/admin.py` customizes the Django admin with a `JsonEditor` widget for editing the `informations` JSON field and custom form validation. Malware families are managed via `/admin/polls/family/`.

## Key Files
- `polls/models.py` — Family model and date validation
- `polls/views.py` — Single view function that prepares data for visualization
- `polls/static/miotree/js/miotree.js` — Core D3.js visualization logic (tree layout, timeline axis, node rendering, hover interactions, parent-child linking lines)
- `polls/admin.py` — Custom admin form with JSON field editor
