# Platform Entity Designer - Demo Walkthrough

A step-by-step guide to demonstrate the Platform Entity Designer feature.

---

## Prerequisites

Make sure both servers are running:
```bash
cd /Users/colinthornburg/dbt-config-driven-app
./start-all.sh
```

Then open: **http://localhost:3000**

---

## Demo: Create a Customer Dimension

### Step 1: Navigate to Platform Entities Tab

1. **Click** the **"Platform Entities"** tab (second tab at top)

You should see:
- Empty entities list
- "Control Fields Reference" section showing what each entity type gets

---

### Step 2: Start New Entity Wizard

1. **Click** the blue **"New Entity"** button

---

### Step 3: Select Entity Type

1. **Click** the **"📊 Dimension"** card

   You'll see the auto-injected fields appear:
   - `_surrogate_key`
   - `_valid_from`
   - `_valid_to`
   - `_is_current`

2. **Click** **"Next: Source Configuration"** button

---

### Step 4: Configure Source

Fill in the following fields:

| Field | Value to Type |
|-------|---------------|
| **Model Name** | `dim_customer_demo` |
| **Primary Key** | `customer_id` |
| **Source Table** | Select: `raw_customers` |
| **Description** | `Customer dimension for demo` |

Then **Click** **"Next: Column Selection"**

---

### Step 5: Select Columns

1. **Click** **"Select All"** to select all columns

2. *(Optional)* Check the **"Track Changes (SCD2)"** checkbox for these columns:
   - `email`
   - `address_line1`
   - `city`

3. **Click** **"Next: Relationships"** button

---

### Step 6: Define Relationships (Optional)

For this demo, you can skip adding relationships:

1. **Click** **"Preview & Submit"** button

*(If you want to add one: select `fact_orders_platform` as target, `customer_id` as join key, `one_to_many` cardinality)*

---

### Step 7: Review and Submit

Review the preview showing:
- Entity Type: Dimension
- Model Name: `dim_customer_demo`
- Source Table: `raw_customers`
- Selected columns
- Auto-injected platform control fields

1. **Click** the green **"Create Entity"** button

---

### Step 8: Success!

You should see:
- ✅ "Platform Entity Created" message
- Files created:
  - `models/platform_demo/dim_customer_demo.sql`
  - `models/platform_demo/platform_demo.yml` (updated)

1. **Click** **"Done"** to return to dashboard

---

## Verify in dbt

After the demo, verify by running:

```bash
cd config-driven-dbt
dbt compile --select dim_customer_demo
```

The compiled SQL will show your columns **plus** all the platform control fields automatically added!

---

## Quick Demo Script (30 seconds)

> "Watch how easy it is to create a platform-managed dimension with automatic control fields..."

1. Click **Platform Entities** tab
2. Click **New Entity**
3. Click **Dimension** card → **Next**
4. Type `dim_customer_demo` → Select `raw_customers` → Type `customer_id` → **Next**
5. Click **Select All** → **Next**
6. Click **Preview & Submit**
7. Click **Create Entity**

> "Done! The platform automatically injected surrogate keys, SCD Type 2 validity tracking, and lineage fields - all without writing any SQL."

---

## Cleanup

To remove the demo entity:
1. Go to **Platform Entities** tab
2. Click the red **"Delete"** button next to `dim_customer_demo`


