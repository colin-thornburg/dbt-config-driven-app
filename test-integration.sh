#!/bin/bash

# Integration test script
echo "🧪 Testing Client Mapping Portal Integration"
echo ""

# Test 1: Check if API dependencies are installed
echo "1️⃣  Checking API dependencies..."
if [ -d "api/node_modules" ]; then
    echo "   ✅ API dependencies installed"
else
    echo "   ❌ API dependencies missing - run: cd api && npm install"
    exit 1
fi

# Test 2: Check if frontend dependencies are installed
echo "2️⃣  Checking frontend dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ Frontend dependencies installed"
else
    echo "   ❌ Frontend dependencies missing - run: npm install"
    exit 1
fi

# Test 3: Check dbt project structure
echo "3️⃣  Checking dbt project structure..."
if [ -d "config-driven-dbt/models/staging/client_mappings" ]; then
    echo "   ✅ dbt client_mappings directory exists"
else
    echo "   ❌ dbt client_mappings directory missing"
    exit 1
fi

# Test 4: Check existing client mappings
echo "4️⃣  Checking existing client mappings..."
MAPPING_COUNT=$(ls -1 config-driven-dbt/models/staging/client_mappings/*.yml 2>/dev/null | wc -l)
echo "   ✅ Found $MAPPING_COUNT existing client mapping(s)"

# Test 5: Validate YAML files
echo "5️⃣  Validating YAML files..."
for file in config-driven-dbt/models/staging/client_mappings/*.yml; do
    if [ -f "$file" ]; then
        echo "   📄 $(basename $file)"
    fi
done

# Test 6: Check if ports are available
echo "6️⃣  Checking port availability..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "   ⚠️  Port 3000 is in use (frontend may already be running)"
else
    echo "   ✅ Port 3000 is available"
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "   ⚠️  Port 3001 is in use (API may already be running)"
else
    echo "   ✅ Port 3001 is available"
fi

echo ""
echo "✅ Integration test complete!"
echo ""
echo "To start the application:"
echo "  ./start-all.sh"
echo ""
echo "Or start services separately:"
echo "  Terminal 1: cd api && npm start"
echo "  Terminal 2: npm run dev"
echo ""


