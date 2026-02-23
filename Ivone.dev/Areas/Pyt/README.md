# Pyt Area (Пътен лист)

`Pyt` is a standalone vehicle trip-sheet module under `Areas/Pyt` optimized for very fast trip entry.

## What is included

- Cookie auth (register/login/logout) for `Pyt` users.
- CRUD APIs and UI for:
  - Vehicles
  - Drivers
  - Locations
- Trip workflow with smart defaults:
  - last-used values per user
  - last trip values per selected vehicle
  - one-click date shortcuts
  - `Save & New` batch flow
- Hard validation rules:
  - `EndMileage >= StartMileage`
  - `EndDateTime >= StartDateTime`
  - vehicle and driver required
- Soft warning rules:
  - distance `0`
  - unusually large distance
  - far-future end date
- Export endpoints:
  - PDF
  - Excel
- Seed/demo data for instant testing.

## Paths

- Area pages: `Ivone.dev/Areas/Pyt/Pages`
- API controllers: `Ivone.dev/Areas/Pyt/Controllers`
- Services: `Ivone.dev/Areas/Pyt/Services`
- DTOs: `Ivone.dev/Areas/Pyt/Dtos`
- Frontend JS/CSS:
  - `Ivone.dev/wwwroot/js/pyt`
  - `Ivone.dev/wwwroot/css/pyt.css`

## Data model

Added EF entities in `Ivone.dev.Data/Models/Pyt`:

- `PytUser`
- `PytVehicle`
- `PytDriver`
- `PytLocation`
- `PytTrip`
- `PytUserPreference`

DbSets and mappings are configured in `Ivone.dev.Data/Contexts/AppDbContext.cs`.

## Migration and SQL

Migration:

- `Ivone.dev.Data/Migrations/20260213080904_AddPytModule.cs`

Generated SQL script:

- `Ivone.dev.Data/Migrations/Sql/20260213080904_AddPytModule.sql`

Apply SQL manually (example):

```sql
:r Ivone.dev.Data/Migrations/Sql/20260213080904_AddPytModule.sql
```

Or apply via EF:

```bash
dotnet ef database update --project Ivone.dev.Data --startup-project Ivone.dev
```

## Demo login

Seeded user:

- Email: `demo@pyt.local`
- Password: `demo123!`

## API summary

Auth:

- `POST /api/pyt/auth/register`
- `POST /api/pyt/auth/login`
- `POST /api/pyt/auth/logout`
- `GET /api/pyt/auth/me`

Master data:

- `GET/POST/PUT /api/pyt/vehicles`
- `POST /api/pyt/vehicles/{id}/deactivate`
- `GET/POST/PUT /api/pyt/drivers`
- `POST /api/pyt/drivers/{id}/deactivate`
- `GET/POST/PUT /api/pyt/locations`
- `POST /api/pyt/locations/{id}/deactivate`

Trips:

- `GET /api/pyt/trips/bootstrap`
- `GET /api/pyt/trips/defaults`
- `GET /api/pyt/trips`
- `GET /api/pyt/trips/{id}`
- `POST /api/pyt/trips`
- `PUT /api/pyt/trips/{id}`
- `DELETE /api/pyt/trips/{id}`
- `GET /api/pyt/trips/export/pdf`
- `GET /api/pyt/trips/export/excel`
