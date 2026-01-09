# Frontend-Backend Integration Guide

## Architecture Overview

The Client Mapping Portal consists of three main components:

```
┌─────────────────────┐
│  React Frontend     │  Port 3000
│  (User Interface)   │
└──────────┬──────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐
│  Express API        │  Port 3001
│  (YAML Generator)   │
└──────────┬──────────┘
           │ File System
           ▼
┌─────────────────────┐
│  dbt Project        │
│  (config-driven-dbt)│
└─────────────────────┘
```

## How It Works

### 1. User Creates Mapping (Frontend)
- User fills out the 4-step wizard
- Selects source table and target model
- Maps fields using direct mapping or expression builder
- Reviews generated SQL and sample data

### 2. API Generates Configuration (Backend)
When the user clicks "Submit for Review":

1. **Frontend** sends POST request to `/api/clients` with:
   ```json
   {
     "config": {
       "clientName": "Acme Corp",
       "clientCode": "ACME",
       "targetModel": "dim_candidate",
       "sourceTable": "acme_employee_feed"
     },
     "mappings": {
       "candidate_id": { "expression": "emp_id", "type": "direct" },
       "full_name": { "expression": "fname || ' ' || lname", "type": "function" },
       ...
     }
   }
   ```

2. **API** generates YAML file:
   ```yaml
   version: 2
   client_config:
     client_code: ACME
     client_name: Acme Corp
     source_table: acme_employee_feed
     target_model: dim_candidate
     field_mappings:
       candidate_id: "emp_id"
       full_name: "fname || ' ' || lname"
       ...
   ```

3. **API** writes file to:
   ```
   config-driven-dbt/models/staging/client_mappings/acme.yml
   ```

4. **API** updates the macro:
   ```
   config-driven-dbt/macros/get_client_mapping.sql
   ```

5. **API** commits changes to git:
   ```bash
   git add models/staging/client_mappings/acme.yml
   git add macros/get_client_mapping.sql
   git commit -m "Add client mapping for Acme Corp"
   ```

### 3. dbt Reads Configuration (Runtime)
When `dbt build` runs:

1. **Macro** `get_client_mappings()` reads all YAML files
2. **Staging model** `stg_candidates_unioned` dynamically generates UNION query
3. **Dimension model** `dim_candidate` transforms and enriches the data

## API Endpoints

### GET `/api/clients`
Returns list of existing client mappings.

**Response:**
```json
[
  {
    "id": "acme",
    "name": "Acme Corp",
    "targetModel": "dim_candidate",
    "status": "Active",
    "lastUpdated": "2024-12-20"
  }
]
```

### GET `/api/sources`
Returns available source schemas and tables.

**Response:**
```json
{
  "raw_clients": [
    "acme_employee_feed",
    "globex_staff_records",
    "wayne_enterprises_workers"
  ]
}
```

### GET `/api/sources/:schema/:table`
Returns field schema for a specific source table.

**Response:**
```json
[
  { "name": "emp_id", "type": "varchar", "sample": "EMP-99201" },
  { "name": "fname", "type": "varchar", "sample": "John" },
  { "name": "lname", "type": "varchar", "sample": "Doe" }
]
```

### POST `/api/clients`
Creates a new client mapping.

**Request Body:**
```json
{
  "config": { ... },
  "mappings": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Client mapping created successfully",
  "filename": "acme.yml"
}
```

## Running the Full Stack

### Option 1: Start All Services Together
```bash
./start-all.sh
```

### Option 2: Start Services Separately

**Terminal 1 - API:**
```bash
cd api
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - dbt (when ready to test):**
```bash
cd config-driven-dbt
dbt build
```

## Development Workflow

1. **Make changes** to the frontend or API
2. **Test locally** using the portal
3. **Verify** the YAML files are created correctly
4. **Run dbt build** to ensure the configuration works
5. **Commit** changes to git
6. **Push** to trigger CI/CD pipeline

## File Structure

```
dbt-config-driven-app/
├── src/                          # React frontend
│   ├── ClientMappingPortal.jsx   # Main UI component
│   ├── api.js                    # API client
│   └── main.jsx                  # Entry point
├── api/                          # Express backend
│   ├── server.js                 # API server
│   └── package.json              # API dependencies
├── config-driven-dbt/            # dbt project
│   ├── models/
│   │   ├── staging/
│   │   │   ├── client_mappings/  # Generated YAML files
│   │   │   └── stg_candidates_unioned.sql
│   │   └── dimensions/
│   │       └── dim_candidate.sql
│   └── macros/
│       └── get_client_mapping.sql
└── start-all.sh                  # Convenience script
```

## Next Steps

### For Production:
1. **Authentication** - Add Azure AD SSO
2. **Database Connection** - Query Snowflake for real source schemas
3. **CI/CD** - Automate PR creation and testing
4. **Validation** - Add more robust YAML validation
5. **Rollback** - Add ability to deactivate/rollback mappings
6. **Monitoring** - Add logging and error tracking
7. **Multi-environment** - Support dev/staging/prod environments

### For Testing:
1. Add unit tests for API endpoints
2. Add integration tests for full workflow
3. Add E2E tests with Playwright/Cypress
4. Add dbt tests for generated models


