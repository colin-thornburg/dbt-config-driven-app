# Reset Demo Feature

## Overview

Added a "Reset Demo" button to the Client Mapping Portal that allows you to quickly reset to a clean demo state.

## What It Does

When you click **"🔄 Reset Demo"**:

1. **Removes test clients** - Deletes ACME, ACME_2, ACME_3, and any other test mappings
2. **Keeps base clients** - Preserves GLOBEX and WAYNE as demo starting points
3. **Updates dbt_project.yml** - Resets the `vars.client_mappings` to only include GLOBEX and WAYNE
4. **Deletes YAML files** - Removes the individual client mapping files (acme.yml, acme_2.yml, etc.)
5. **Commits to Git** - Automatically commits the reset with a clear message

## Use Case

Perfect for demos! You can:
- Run multiple demos without accumulating test clients
- Always start fresh with GLOBEX and WAYNE as examples
- Use ACME as your demo client name (since it will be removed each time)

## How to Use

1. **Start the API server** (if not running):
   ```bash
   cd api
   npm start
   ```

2. **Open the Client Mapping Portal** in your browser (http://localhost:5173)

3. **Click "🔄 Reset Demo"** button on the dashboard

4. **Confirm the action** - You'll see a confirmation dialog explaining what will happen

5. **Done!** The dashboard will refresh showing only GLOBEX and WAYNE

## Technical Details

### API Endpoint

**POST** `/api/reset-demo`

Response:
```json
{
  "success": true,
  "message": "Demo data reset successfully",
  "remainingClients": ["GLOBEX", "WAYNE"],
  "deletedFiles": ["acme.yml", "acme_2.yml", "acme_3.yml"]
}
```

### Files Modified

- **Backend**: `api/server.js` - Added `/api/reset-demo` endpoint
- **Frontend**: 
  - `src/api.js` - Added `resetDemo()` method
  - `src/ClientMappingPortal.jsx` - Added reset button and handler

### What Gets Reset

#### dbt_project.yml
```yaml
vars:
  client_mappings:
    - client_code: GLOBEX
      client_name: Globex Corporation
      # ... GLOBEX config ...
    
    - client_code: WAYNE
      client_name: Wayne Enterprises
      # ... WAYNE config ...
```

#### Deleted Files
- `config-driven-dbt/models/staging/client_mappings/acme.yml`
- `config-driven-dbt/models/staging/client_mappings/acme_2.yml`
- `config-driven-dbt/models/staging/client_mappings/acme_3.yml`
- Any other non-base client mapping files

#### Preserved Files
- `config-driven-dbt/models/staging/client_mappings/globex.yml`
- `config-driven-dbt/models/staging/client_mappings/wayne.yml`

## Demo Workflow

1. **Reset** - Click "🔄 Reset Demo" to start fresh
2. **Show** - Display the current clients (GLOBEX, WAYNE)
3. **Demo** - Walk through adding ACME as a new client
4. **Verify** - Go to dbt Cloud and compile `stg_candidates_unioned`
5. **Repeat** - Click reset again for your next demo!

## Git Integration

The reset automatically:
1. Creates a Git commit
2. **Pushes to remote** (`origin/main`)

**Commit message:**
```
🔄 Reset demo data to base configuration

- Removed test client mappings (ACME, ACME_2, ACME_3, etc.)
- Kept base clients: GLOBEX, WAYNE
- Ready for demo with fresh ACME onboarding
```

**No manual push needed!** The changes are automatically pushed to your GitHub repository.

## Safety Features

- **Confirmation dialog** - Prevents accidental resets
- **Base clients protected** - GLOBEX and WAYNE are never deleted
- **Git commit** - Changes are tracked in version control
- **Error handling** - Shows clear error messages if something fails

## Testing

To test the reset feature:

1. Add a test client (e.g., ACME) via the portal
2. Verify it appears in the dashboard
3. Click "🔄 Reset Demo"
4. Confirm the action
5. Verify ACME is removed and only GLOBEX/WAYNE remain
6. Check `dbt_project.yml` to confirm it only has 2 clients
7. Compile in dbt Cloud to verify the changes

## Notes

- The reset does **not** push to remote automatically (you can enable this in `server.js` if desired)
- Seed data files (`acme_employee_feed.csv`, etc.) are **not** deleted - they can be reused
- The reset is **not** reversible (unless you revert the Git commit)

