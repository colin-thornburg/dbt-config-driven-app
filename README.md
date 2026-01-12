# Config-Driven Data Platform

A full-stack application for building and managing dbt data models through visual interfaces - **no SQL or YAML required**. Features two powerful tools:

## 🎯 Two Use Cases, One Platform

| Feature | Client Mapping Portal | Platform Entity Designer |
|---------|----------------------|--------------------------|
| **Purpose** | Onboard clients with different data schemas | Define data models with auto-injected control fields |
| **Target Users** | Data Analysts | Data Engineers / Platform Teams |
| **Output** | YAML configs for client-specific mappings | dbt models with platform-managed fields |
| **Key Benefit** | No SQL changes needed per client | Standardized control fields (CDC, SCD2, lineage) |

---

## 📁 Repository Structure (Important!)

This repository uses a **Git submodule** to link to the dbt project:

```
dbt-config-driven-app/              ← This repository (you are here)
├── src/                            ← React frontend
├── api/                            ← Express API
├── config-driven-dbt/              ← Git submodule (separate repo)
│   └── → github.com/colin-thornburg/config-driven-dbt
└── README.md                       ← This file
```

**What is `config-driven-dbt @ d5a1117`?**

The `config-driven-dbt` folder is a **Git submodule** - it's a pointer to a separate repository at:
**https://github.com/colin-thornburg/config-driven-dbt**

The `@ d5a1117` shows which commit of that repository is being used. This allows the dbt project to:
- ✅ Have its own Git history and version control
- ✅ Be updated independently from the frontend/API
- ✅ Be used in other projects if needed

**When cloning this repo**, use:
```bash
# Clone with submodule in one command
git clone --recursive https://github.com/colin-thornburg/dbt-config-driven-app.git

# Or if already cloned without submodule:
git submodule update --init --recursive
```

---

## 🎯 What Problems Does This Solve?

### Problem 1: Client Onboarding (Client Mapping Portal)

**The Old Way:**
- Data analyst gets a new client with a different data format
- Manually writes SQL transformations
- Manually creates dbt YAML configurations
- Manually tests field mappings
- Repeats for every new client 😫

**The New Way:**
- Data analyst opens a web portal
- Selects the client's source table
- Visually maps fields using drag-and-drop style interface
- Clicks "Submit" - done! ✨
- dbt automatically reads the config and builds the models

### Problem 2: Platform Standardization (Platform Entity Designer)

**The Old Way:**
- Platform team wants standardized control fields (CDC timestamps, surrogate keys, lineage tracking)
- Developers must remember to add these fields to every model
- Inconsistent field names and implementations across models
- No validation that required metadata is present
- Runtime code can't rely on consistent field structures 😫

**The New Way:**
- Platform architect defines entity types (dimension, fact, bridge, etc.)
- Developers use visual wizard to create entities
- Control fields are **automatically injected** based on entity type
- Relationship metadata is captured for runtime optimization
- Platform code can safely assume consistent field structures ✨

**Auto-Injected Control Fields by Entity Type:**

| Entity Type | Control Fields |
|-------------|----------------|
| **Dimension** | `_surrogate_key`, `_valid_from`, `_valid_to`, `_is_current`, `_loaded_at`, `_source_schema`, `_model_name`, `_dbt_run_id` |
| **Fact** | `_transaction_time`, `_ingestion_time`, `_source_system`, `_loaded_at`, `_source_schema`, `_model_name`, `_dbt_run_id` |
| **Bridge** | `_relationship_created_at`, `_is_active`, `_loaded_at`, `_source_schema`, `_model_name`, `_dbt_run_id` |
| **Snapshot** | `_snapshot_date`, `_snapshot_timestamp`, `_loaded_at`, `_source_schema`, `_model_name`, `_dbt_run_id` |
| **Staging** | `_layer`, `_loaded_at`, `_source_schema`, `_model_name`, `_dbt_run_id` |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT MAPPING PORTAL                        │
│                     (React Frontend - Port 3000)                 │
│  • Visual field mapping                                          │
│  • Expression builder (CONCAT, CAST, etc.)                       │
│  • SQL preview                                                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS API SERVER                           │
│                        (Port 3001)                               │
│  • Generates YAML configuration files                            │
│  • Commits to git automatically                                  │
│  • Reads available source tables                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │ File System
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DBT PROJECT                                  │
│                  (config-driven-dbt/)                            │
│  • Macros read YAML configs                                      │
│  • Dynamically builds UNION queries                              │
│  • Creates dimension tables in Snowflake                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install API dependencies
cd api && npm install && cd ..
```

### Step 2: Start Both Services

**Terminal 1 - Start API Server:**
```bash
cd api
npm start
```
You should see: `🚀 Client Mapping API running on http://localhost:3001`

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```
You should see: `Local: http://localhost:3000`

### Step 3: Open the Portal
Open your browser to: **http://localhost:3000**

You should see:
- ✅ Green "API Connected" badge in the header
- ✅ Dashboard showing existing client mappings (GLOBEX, WAYNE)
- ✅ Two action buttons: **"🔄 Reset Demo"** and **"New Client Mapping"**

---

## 📖 How to Use the Portal (Step-by-Step)

### 1️⃣ **Dashboard View**
When you first open the portal, you see:
- List of existing client mappings
- Their target models (e.g., `dim_candidate`)
- Status and last updated date
- **"🔄 Reset Demo"** button (removes test clients, keeps GLOBEX & WAYNE)
- **"New Client Mapping"** button (starts the onboarding wizard)

### 2️⃣ **Click "New Client Mapping"**
This starts the 4-step wizard.

### 3️⃣ **Step 1: Setup**

Fill out the basic information:

| Field | What It Means | Example |
|-------|---------------|---------|
| **Client Name** | The friendly name of your client | "Acme Corporation" |
| **Client Code** | Short uppercase code (used in data) | "ACME" |
| **Target Model** | Which dbt model to populate | `dim_candidate` |
| **Source Schema** | Where the source data lives | `raw_clients` |
| **Source Table** | The specific table with client data | `acme_employee_feed` |

#### 🤔 **What is "Source Schema" and "Source Table"?**

**Source Schema:** Think of this as a folder in your database where raw data lives.
- Example: `raw_clients` - contains all client raw data tables

**Source Table:** The actual table with the client's data.
- Example: `acme_employee_feed` - contains ACME's employee records

**Where does this data come from?**
- In this demo: **Seed files** (CSV files in `config-driven-dbt/seeds/raw_clients/`)
- In production: **Real tables** in Snowflake loaded from client SFTP/API feeds

#### 📊 **About Seed Data (Demo Only)**

For this demo, we use dbt **seeds** (CSV files) to simulate client data:

```
config-driven-dbt/seeds/raw_clients/
├── acme_employee_feed.csv       ← ACME's data (8 rows)
├── globex_staff_records.csv     ← GLOBEX's data (6 rows)
└── wayne_enterprises_workers.csv ← WAYNE's data (5 rows)
```

**Seeds are loaded into Snowflake with:** `dbt seed`

**In Production:** You would replace seeds with real tables that are loaded via:
- SFTP file drops
- API integrations
- Database replication
- ETL tools (Fivetran, Airbyte, etc.)

### 4️⃣ **Step 2: Field Mapping**

This is where the magic happens! You map fields from the **source table** to the **target model**.

**Example:**

| Target Field | Source Mapping | Type |
|--------------|----------------|------|
| `candidate_id` | `emp_id` | Direct (1:1) |
| `full_name` | `fname \|\| ' ' \|\| lname` | Expression (CONCAT) |
| `email` | `email_address` | Direct (1:1) |
| `phone_number` | `mobile` | Direct (1:1) |
| `hire_date` | `CAST(start_dt AS DATE)` | Expression (CAST) |
| `hourly_rate` | `rate_per_hour` | Direct (1:1) |
| `client_code` | `'ACME'` | Static value |

**Mapping Options:**

1. **Direct Mapping** - Simple field-to-field (e.g., `emp_id` → `candidate_id`)
2. **Expression Builder** - Build SQL expressions:
   - **CONCAT**: Combine fields (`fname || ' ' || lname`)
   - **CAST**: Convert types (`CAST(start_dt AS DATE)`)
   - **UPPER/LOWER**: Text transformations
   - **COALESCE**: Handle nulls
3. **Static Values** - Fixed values (e.g., `'ACME'` for client_code)

**Required Fields** are marked with a red asterisk (*). You must map all required fields before proceeding.

### 5️⃣ **Step 3: Preview**

Before submitting, you see:

1. **Generated SQL** - The exact SQL dbt will use:
   ```sql
   SELECT
       emp_id AS candidate_id,
       fname || ' ' || lname AS full_name,
       email_address AS email,
       ...
   FROM {{ ref('acme_employee_feed') }}
   ```

2. **Sample Output** - Preview of what the data will look like (first 3 rows)

3. **Validation Results** - Automated checks:
   - ✅ All required fields mapped
   - ✅ Data types compatible
   - ✅ Sample query executed successfully

### 6️⃣ **Step 4: Submit**

Click **"Submit for Review"** and the system:

1. ✅ **Generates YAML file** (for documentation/reference)
2. ✅ **Updates dbt_project.yml** (adds client to vars.client_mappings)
3. ✅ **Commits to git** (automatic commit with descriptive message)
4. ✅ **Shows success screen** (confirmation with git commit hash)

---

## 📝 What Exactly Gets Modified in the dbt Project?

When you submit a new client mapping through the portal, here's **EXACTLY** what changes in your dbt project:

### 🎯 **Two Files Are Modified**

#### 1. **NEW FILE CREATED** (for reference only)
**Location:** `config-driven-dbt/models/staging/client_mappings/acme.yml`

```yaml
version: 2
client_config:
  client_code: ACME
  client_name: Acme Corp
  source_table: acme_employee_feed
  target_model: dim_candidate
  created_by: client-mapping-portal
  created_at: '2026-01-08T12:36:41.708Z'
  field_mappings:
    candidate_id: emp_id
    full_name: "fname || ' ' || lname"
    email: email_address
    phone_number: mobile
    hire_date: start_dt
    hourly_rate: rate_per_hour
    client_code: "'ACME'"
```

**Purpose:** Documentation/reference only. Shows what mappings were created.

---

#### 2. **EXISTING FILE UPDATED** (this is the important one!)
**Location:** `config-driven-dbt/dbt_project.yml`

The API adds your new client to the `vars.client_mappings` list:

**BEFORE (only 2 clients):**
```yaml
vars:
  client_mappings:
    - client_code: GLOBEX
      client_name: Globex Corporation
      source_table: globex_staff_records
      target_model: dim_candidate
      field_mappings:
        candidate_id: staff_id
        full_name: full_name
        email: work_email
        # ... more fields ...
    
    - client_code: WAYNE
      client_name: Wayne Enterprises
      source_table: wayne_enterprises_workers
      target_model: dim_candidate
      field_mappings:
        candidate_id: worker_id
        full_name: "first_name || ' ' || last_name"
        email: email
        # ... more fields ...
```

**AFTER (your new client is added):**
```yaml
vars:
  client_mappings:
    - client_code: GLOBEX
      # ... GLOBEX config unchanged ...
    
    - client_code: WAYNE
      # ... WAYNE config unchanged ...
    
    - client_code: ACME          # ← NEW CLIENT ADDED HERE!
      client_name: Acme Corp
      source_table: acme_employee_feed
      target_model: dim_candidate
      field_mappings:
        candidate_id: emp_id
        full_name: "fname || ' ' || lname"
        email: email_address
        phone_number: mobile
        hire_date: start_dt
        hourly_rate: rate_per_hour
        client_code: "'ACME'"
```

---

### 🤔 **Why `dbt_project.yml`? How Does dbt Read This?**

This is the **magic of config-driven dbt**! Here's how it works:

#### **Step 1: Macro Reads the Config**
The `get_client_mapping.sql` macro reads from `dbt_project.yml`:

```jinja
{% macro get_client_mappings(target_model=none) %}
    {# Read client mappings from dbt project variables #}
    {% set all_mappings = var('client_mappings', []) %}
    
    {# Filter by target_model if specified #}
    {% for mapping in all_mappings %}
        {% if target_model is none or mapping.target_model == target_model %}
            {# This client matches! #}
        {% endif %}
    {% endfor %}
{% endmacro %}
```

#### **Step 2: Staging Model Uses the Macro**
The `stg_candidates_unioned.sql` model calls the macro:

```sql
{# Get all client mappings for dim_candidate #}
{% set client_mappings = get_client_mappings('dim_candidate') %}

{# Loop through each client and generate a SELECT statement #}
{% for client in client_mappings %}
    SELECT
        {{ client.field_mappings.candidate_id }} AS candidate_id,
        {{ client.field_mappings.full_name }} AS full_name,
        {{ client.field_mappings.email }} AS email,
        -- ... more fields ...
        '{{ client.client_code }}' AS _source_system
    FROM {{ ref(client.source_table) }}
    
    {% if not loop.last %}
    UNION ALL
    {% endif %}
{% endfor %}
```

#### **Step 3: dbt Compiles to Pure SQL**
When you run `dbt compile`, it generates this SQL:

```sql
-- For GLOBEX
SELECT
    staff_id AS candidate_id,
    full_name AS full_name,
    work_email AS email,
    ...
FROM globex_staff_records

UNION ALL

-- For WAYNE
SELECT
    worker_id AS candidate_id,
    first_name || ' ' || last_name AS full_name,
    email AS email,
    ...
FROM wayne_enterprises_workers

UNION ALL

-- For ACME (your new client!)
SELECT
    emp_id AS candidate_id,
    fname || ' ' || lname AS full_name,
    email_address AS email,
    ...
FROM acme_employee_feed
```

**That's it!** No manual SQL changes needed. dbt automatically picks up the new client!

---

## 🔄 The Complete Data Flow

Let's trace what happens when you submit a mapping:

### 1. **User Submits Mapping** (Frontend)
```javascript
// User clicks "Submit for Review"
POST /api/clients
{
  config: {
    clientName: "Acme Corp",
    clientCode: "ACME",
    targetModel: "dim_candidate",
    sourceTable: "acme_employee_feed"
  },
  mappings: {
    candidate_id: { expression: "emp_id" },
    full_name: { expression: "fname || ' ' || lname" },
    email: { expression: "email_address" },
    phone_number: { expression: "mobile" },
    hire_date: { expression: "start_dt" },
    hourly_rate: { expression: "rate_per_hour" }
  }
}
```

### 2. **API Creates YAML File** (Backend - Reference Only)
Creates: `config-driven-dbt/models/staging/client_mappings/acme.yml`

This file is for **documentation purposes** - dbt doesn't actually read it!

### 3. **API Updates dbt_project.yml** (Backend - THIS IS KEY!)
Updates: `config-driven-dbt/dbt_project.yml`

**This is where the magic happens!** The API:
1. Reads the existing `dbt_project.yml` file
2. Parses the YAML structure
3. Appends your new client to `vars.client_mappings` array
4. Writes the updated YAML back to the file

**Code in `api/server.js`:**
```javascript
async function updateDbtProjectYaml(config, mappings) {
  // Read existing dbt_project.yml
  const dbtProject = yaml.load(content);
  
  // Add new client to vars.client_mappings
  dbtProject.vars.client_mappings.push({
    client_code: config.clientCode,
    client_name: config.clientName,
    source_table: config.sourceTable,
    target_model: config.targetModel,
    field_mappings: fieldMappings
  });
  
  // Write back to file
  await fs.writeFile(projectYmlPath, yaml.dump(dbtProject));
}
```

### 4. **API Commits and Pushes to Git** (Backend)
```bash
git add models/staging/client_mappings/acme.yml
git add dbt_project.yml
git commit -m "Add client mapping for Acme Corp

- Client: Acme Corp (ACME)
- Target model: dim_candidate
- Source: acme_employee_feed
- Created via Client Mapping Portal"

git push origin main
```

**The changes are automatically pushed to your GitHub repository!**

### 5. **dbt Reads Config** (Runtime)
When you run `dbt build`:

**Macro reads YAML:**
```jinja
{% set client_mappings = get_client_mappings('dim_candidate') %}
{# Returns: [ACME, GLOBEX, WAYNE] #}
```

**Staging model generates UNION:**
```sql
-- stg_candidates_unioned.sql
SELECT
    emp_id AS candidate_id,
    fname || ' ' || lname AS full_name,
    ...
FROM acme_employee_feed

UNION ALL

SELECT
    staff_id AS candidate_id,
    full_name AS full_name,
    ...
FROM globex_staff_records

UNION ALL

SELECT
    worker_id AS candidate_id,
    first_name || ' ' || last_name AS full_name,
    ...
FROM wayne_enterprises_workers
```

### 6. **dbt Builds Models** (Snowflake)
```
Seeds (CSV) → Staging View → Dimension Table
     ↓              ↓               ↓
acme_employee_feed → stg_candidates_unioned → dim_candidate
globex_staff_records ↗                             ↓
wayne_enterprises_workers ↗                   (19 rows total)
```

---

## 📁 Project Structure Explained

```
dbt-config-driven-app/
│
├── src/                                    # FRONTEND (React)
│   ├── ClientMappingPortal.jsx            # Main UI component
│   ├── api.js                             # API client (calls backend)
│   └── main.jsx                           # React entry point
│
├── api/                                   # BACKEND (Express)
│   ├── server.js                          # API server
│   │   • GET /api/clients                 # List existing mappings
│   │   • POST /api/clients                # Create new mapping
│   │   • GET /api/sources                 # List source tables
│   │   • GET /api/sources/:schema/:table  # Get table schema
│   └── package.json                       # API dependencies
│
├── config-driven-dbt/                     # DBT PROJECT
│   │
│   ├── models/
│   │   ├── staging/
│   │   │   ├── client_mappings/           # ← YAML configs (generated by API)
│   │   │   │   ├── acme.yml               # ACME's field mappings
│   │   │   │   ├── globex.yml             # GLOBEX's field mappings
│   │   │   │   └── wayne.yml              # WAYNE's field mappings
│   │   │   │
│   │   │   └── stg_candidates_unioned.sql # Reads YAMLs, builds UNION
│   │   │
│   │   └── dimensions/
│   │       └── dim_candidate.sql          # Final dimension table
│   │
│   ├── macros/
│   │   └── get_client_mapping.sql         # Reads YAML files at runtime
│   │
│   └── seeds/
│       └── raw_clients/                   # Demo data (CSV files)
│           ├── acme_employee_feed.csv     # 8 rows
│           ├── globex_staff_records.csv   # 6 rows
│           └── wayne_enterprises_workers.csv # 5 rows
│
├── start-all.sh                           # Convenience script (starts both services)
├── test-integration.sh                    # Test script
├── INTEGRATION.md                         # Detailed integration docs
├── SETUP_COMPLETE.md                      # Setup summary
└── README.md                              # This file
```

---

## 🧪 Testing Your Setup

### Quick Test Script
```bash
./test-integration.sh
```

This checks:
- ✅ Dependencies installed
- ✅ dbt project structure
- ✅ Existing client mappings
- ✅ Port availability

### Manual Testing

**1. Test the API:**
```bash
# Check API health
curl http://localhost:3001/health

# List existing clients
curl http://localhost:3001/api/clients

# List available sources
curl http://localhost:3001/api/sources
```

**2. Test the Frontend:**
- Open http://localhost:3000
- Check for green "API Connected" badge
- View existing clients on dashboard

**3. Test dbt:**
```bash
cd config-driven-dbt

# Check connection
dbt debug

# Load seed data
dbt seed

# Build everything
dbt build
```

**Expected output:**
```
Done. PASS=29 WARN=0 ERROR=0 SKIP=0 NO-OP=0 TOTAL=29
```

---

## 🔄 Reset Demo Feature

Perfect for running multiple demos! The **"🔄 Reset Demo"** button lets you quickly clean up test clients and start fresh.

### What It Does

When you click the reset button:
1. ✅ **Removes** all test client mappings (ACME, ACME_2, ACME_3, etc.)
2. ✅ **Keeps** base demo clients (GLOBEX, WAYNE)
3. ✅ **Updates** `dbt_project.yml` to reflect changes
4. ✅ **Deletes** test YAML files from `client_mappings/`
5. ✅ **Commits** to Git with a clear message
6. ✅ **Refreshes** the dashboard automatically

### Perfect Demo Workflow

1. **Start Fresh** → Click "🔄 Reset Demo"
2. **Show Current State** → Dashboard displays GLOBEX and WAYNE
3. **Run Demo** → Add "ACME" as a new client (walk through wizard)
4. **Verify in dbt** → Compile `stg_candidates_unioned` in dbt Cloud
5. **Repeat** → Click reset again for your next demo!

### What Gets Modified

**Files Deleted:**
- `config-driven-dbt/models/staging/client_mappings/acme.yml`
- `config-driven-dbt/models/staging/client_mappings/acme_2.yml`
- Any other test client YAML files

**Files Preserved:**
- `config-driven-dbt/models/staging/client_mappings/globex.yml`
- `config-driven-dbt/models/staging/client_mappings/wayne.yml`
- All seed data files (CSV files are reusable!)

**dbt_project.yml Updated:**
```yaml
# BEFORE reset (5 clients)
vars:
  client_mappings:
    - client_code: GLOBEX
    - client_code: WAYNE
    - client_code: ACME      # ← Will be removed
    - client_code: ACME_2    # ← Will be removed
    - client_code: ACME_3    # ← Will be removed

# AFTER reset (2 clients)
vars:
  client_mappings:
    - client_code: GLOBEX    # ← Kept
    - client_code: WAYNE     # ← Kept
```

### Safety Features

- **Confirmation dialog** prevents accidental resets
- **Base clients protected** (GLOBEX and WAYNE never deleted)
- **Git commit created** (changes are tracked and reversible)
- **Auto-pushed to remote** (changes go to GitHub automatically)
- **Success message shows** what was deleted

### How to Use

1. Click **"🔄 Reset Demo"** button on dashboard
2. Confirm the action in the dialog
3. Wait for success message (changes are pushed to GitHub)
4. Dashboard refreshes showing only GLOBEX and WAYNE
5. Ready for your next demo with ACME!

**Note:** The reset automatically commits AND pushes to `origin/main`. No manual push needed!

---

## 🎬 Complete Walkthrough Example

Let's onboard a new client called "Initech" step-by-step:

### 1. **Start the Services**
```bash
# Terminal 1
cd api && npm start

# Terminal 2
npm run dev
```

### 2. **Open Portal**
Go to: http://localhost:3000

### 3. **Click "New Client Mapping"**

### 4. **Fill Out Setup (Step 1)**
- Client Name: `Initech`
- Client Code: `INITECH`
- Target Model: `dim_candidate`
- Source Schema: `raw_clients`
- Source Table: `acme_employee_feed` (reusing for demo)

### 5. **Map Fields (Step 2)**
- `candidate_id` → `emp_id`
- `full_name` → Build Expression → CONCAT → `fname`, `' '`, `lname`
- `email` → `email_address`
- `phone_number` → `mobile`
- `hire_date` → Build Expression → CAST → `start_dt` AS `DATE`
- `hourly_rate` → `rate_per_hour`
- `client_code` → (auto-populated as `'INITECH'`)

### 6. **Preview (Step 3)**
Review the generated SQL and sample data.

### 7. **Submit (Step 4)**
Click "Submit for Review"

### 8. **Verify**
```bash
# Check YAML was created
cat config-driven-dbt/models/staging/client_mappings/initech.yml

# Check git commit
cd config-driven-dbt
git log -1

# Build in dbt
dbt build
```

### 9. **Query in Snowflake**
```sql
SELECT * FROM colint_demo.dbt_config.dim_candidate 
WHERE client_code = 'INITECH';
```

---

## 🔧 Configuration & Customization

### Adding New Target Models

Currently supports: `dim_candidate`

To add more (e.g., `dim_placement`):

1. **Update macro:** `config-driven-dbt/macros/mapping_helpers.sql`
   - Add to `get_target_fields()` macro

2. **Create dbt model:** `config-driven-dbt/models/dimensions/dim_placement.sql`

3. **Update frontend:** `src/ClientMappingPortal.jsx`
   - Add to `targetModels` object

### Connecting to Real Data Sources

Replace seeds with real Snowflake tables:

1. **Remove seed dependency:**
   - Update `get_client_mappings()` macro
   - Change `source_table` to reference real tables

2. **Update API:**
   - Modify `GET /api/sources` to query `information_schema`
   - Query real table schemas instead of CSV files

3. **Example:**
   ```javascript
   // In api/server.js
   app.get('/api/sources/:schema/:table', async (req, res) => {
     // Query Snowflake information_schema
     const query = `
       SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = '${schema}'
       AND table_name = '${table}'
     `;
     // Execute and return results
   });
   ```

---

## 🚨 Troubleshooting

### "API Offline" Badge (Red)
**Problem:** Frontend can't connect to API

**Solution:**
```bash
# Check if API is running
lsof -ti:3001

# If nothing, start it
cd api && npm start
```

### "Failed to fetch" Error
**Problem:** API server crashed or not started

**Solution:** Check API terminal for errors, restart if needed

### Reset Button Shows JSON Error
**Problem:** `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**Cause:** API server was started before the reset endpoint was added

**Solution:** Restart the API server:
```bash
# In Terminal 2 (where API is running)
# Press Ctrl+C to stop
# Then restart:
cd api && npm start
```

### dbt build fails
**Problem:** YAML configuration is invalid

**Solution:**
```bash
cd config-driven-dbt

# Check for syntax errors
dbt parse

# Check specific model
dbt compile --select stg_candidates_unioned
```

### Port Already in Use
**Problem:** Port 3000 or 3001 is occupied

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

---

## 📚 Additional Documentation

- **[INTEGRATION.md](./INTEGRATION.md)** - Detailed API documentation and architecture
- **[RESET_DEMO_FEATURE.md](./RESET_DEMO_FEATURE.md)** - Complete guide to the reset demo functionality
- **[DYNAMIC_SOLUTION.md](./DYNAMIC_SOLUTION.md)** - Technical details on the dynamic client mapping system
- **[SETUP_COMPLETE.md](./SETUP_COMPLETE.md)** - Setup summary and validation
- **[START.md](./START.md)** - Quick start guide for the frontend

---

## 🎯 Next Steps for Production

### Immediate Improvements:
1. **Authentication** - Add Azure AD SSO
2. **Real Data Sources** - Connect to Snowflake `information_schema`
3. **PR Workflow** - Create PRs instead of direct commits
4. **Validation** - Add schema validation and SQL linting

### Advanced Features:
5. **Multi-Environment** - Support dev/staging/prod
6. **Rollback** - Deactivate/rollback mappings
7. **Monitoring** - Add logging and error tracking
8. **Testing** - Unit, integration, and E2E tests
9. **Audit Trail** - Track who created/modified mappings
10. **Notifications** - Email/Slack when mappings are deployed

---

## 📋 Quick Reference

### Files Modified When You Add a Client

| File | Action | Purpose |
|------|--------|---------|
| `dbt_project.yml` | **UPDATED** | Adds client to `vars.client_mappings` - dbt reads this! |
| `client_mappings/{client}.yml` | **CREATED** | Documentation/reference only |
| Git | **COMMITTED** | Tracks changes with descriptive message |

### Key Concepts

| Term | What It Means |
|------|---------------|
| **Client Mapping** | Configuration that tells dbt how to transform a client's data |
| **Source Table** | Raw data table (e.g., `acme_employee_feed`) |
| **Target Model** | dbt model to populate (e.g., `dim_candidate`) |
| **Field Mappings** | How source fields map to target fields |
| **Config-Driven** | dbt reads YAML configs instead of hardcoded SQL |
| **Dynamic UNION** | dbt generates UNION ALL for all clients automatically |

### Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001 |
| dbt Cloud | - | https://cloud.getdbt.com |

### Common Commands

```bash
# Start everything
./start-all.sh

# Or manually:
cd api && npm start        # Terminal 1: Start API
npm run dev                 # Terminal 2: Start Frontend

# Test dbt
cd config-driven-dbt
dbt compile --select stg_candidates_unioned
dbt build

# Reset for demo
# Click "🔄 Reset Demo" in the portal UI
```

### What Makes This System "Dynamic"?

**Traditional dbt:** Add new client = manually edit SQL files
```sql
-- Must manually add this every time:
SELECT * FROM acme_employee_feed
UNION ALL
SELECT * FROM new_client_feed  -- ← Manual change needed!
```

**This system:** Add new client = automatically appears in SQL
```yaml
# Just add to dbt_project.yml:
vars:
  client_mappings:
    - client_code: NEW_CLIENT  # ← dbt auto-generates SQL!
```

The portal does this for you with a visual interface - no manual editing required!

---

## 🎊 You're Ready!

The Client Mapping Portal is a complete, working solution for config-driven dbt workflows. Start onboarding clients without writing SQL! 🚀

**Questions?** Check the [INTEGRATION.md](./INTEGRATION.md) for detailed technical documentation.
