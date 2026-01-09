import express from 'express';
import cors from 'cors';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to the dbt project
const DBT_PROJECT_PATH = path.join(__dirname, '..', 'config-driven-dbt');
const CLIENT_MAPPINGS_PATH = path.join(DBT_PROJECT_PATH, 'models', 'staging', 'client_mappings');
const SEEDS_PATH = path.join(DBT_PROJECT_PATH, 'seeds', 'raw_clients');

// Initialize git
const git = simpleGit(DBT_PROJECT_PATH);

// Helper function to generate client mapping YAML
function generateClientMappingYAML(config, mappings) {
  const yamlContent = {
    version: 2,
    client_config: {
      client_code: config.clientCode,
      client_name: config.clientName,
      source_table: config.sourceTable,
      target_model: config.targetModel,
      created_by: 'client-mapping-portal',
      created_at: new Date().toISOString(),
      field_mappings: {}
    }
  };

  // Add field mappings
  Object.keys(mappings).forEach(targetField => {
    if (mappings[targetField]?.expression) {
      yamlContent.client_config.field_mappings[targetField] = mappings[targetField].expression;
    }
  });

  return yaml.dump(yamlContent, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
}

// Helper function to update dbt_project.yml with new client mapping
async function updateDbtProjectYaml(config, mappings) {
  const projectYmlPath = path.join(DBT_PROJECT_PATH, 'dbt_project.yml');
  
  // Read the existing project file
  const content = await fs.readFile(projectYmlPath, 'utf-8');
  const dbtProject = yaml.load(content);
  
  // Initialize vars if not exists
  if (!dbtProject.vars) {
    dbtProject.vars = {};
  }
  if (!dbtProject.vars.client_mappings) {
    dbtProject.vars.client_mappings = [];
  }
  
  // Check if client already exists
  const existingIndex = dbtProject.vars.client_mappings.findIndex(
    m => m.client_code === config.clientCode
  );
  
  // Build field mappings object
  const fieldMappings = {};
  Object.keys(mappings).forEach(targetField => {
    if (mappings[targetField]?.expression) {
      fieldMappings[targetField] = mappings[targetField].expression;
    }
  });
  
  // Create new mapping object
  const newMapping = {
    client_code: config.clientCode,
    client_name: config.clientName,
    source_table: config.sourceTable,
    target_model: config.targetModel,
    field_mappings: fieldMappings
  };
  
  // Add or update the mapping
  if (existingIndex >= 0) {
    dbtProject.vars.client_mappings[existingIndex] = newMapping;
  } else {
    dbtProject.vars.client_mappings.push(newMapping);
  }
  
  // Write back to file with nice formatting
  const yamlContent = yaml.dump(dbtProject, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false
  });
  
  await fs.writeFile(projectYmlPath, yamlContent, 'utf-8');
}

// API Routes

// Get existing client mappings
app.get('/api/clients', async (req, res) => {
  try {
    const files = await fs.readdir(CLIENT_MAPPINGS_PATH);
    const yamlFiles = files.filter(f => f.endsWith('.yml'));
    
    const clients = await Promise.all(
      yamlFiles.map(async (file) => {
        const content = await fs.readFile(path.join(CLIENT_MAPPINGS_PATH, file), 'utf-8');
        const data = yaml.load(content);
        return {
          id: file.replace('.yml', ''),
          name: data.client_config?.client_name || file.replace('.yml', ''),
          targetModel: data.client_config?.target_model || 'unknown',
          status: 'Active',
          lastUpdated: data.client_config?.created_at || new Date().toISOString().split('T')[0]
        };
      })
    );
    
    res.json(clients);
  } catch (error) {
    console.error('Error reading clients:', error);
    res.status(500).json({ error: 'Failed to read client mappings' });
  }
});

// Get available source schemas and tables
app.get('/api/sources', async (req, res) => {
  try {
    // In a real implementation, this would query Snowflake metadata
    // For now, return the seed files as available sources
    const seedFiles = await fs.readdir(SEEDS_PATH);
    const csvFiles = seedFiles.filter(f => f.endsWith('.csv'));
    
    const sources = {
      raw_clients: csvFiles.map(f => f.replace('.csv', ''))
    };
    
    res.json(sources);
  } catch (error) {
    console.error('Error reading sources:', error);
    res.status(500).json({ error: 'Failed to read sources' });
  }
});

// Get source schema (columns) for a specific table
app.get('/api/sources/:schema/:table', async (req, res) => {
  try {
    const { schema, table } = req.params;
    const csvPath = path.join(SEEDS_PATH, `${table}.csv`);
    
    // Read the CSV header to get column names
    const content = await fs.readFile(csvPath, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Get sample data from first row
    const sampleRow = lines[1]?.split(',').map(v => v.trim()) || [];
    
    const fields = headers.map((name, idx) => ({
      name,
      type: 'varchar', // Simplified - in production would detect types
      sample: sampleRow[idx] || ''
    }));
    
    res.json(fields);
  } catch (error) {
    console.error('Error reading source schema:', error);
    res.status(500).json({ error: 'Failed to read source schema' });
  }
});

// Submit new client mapping
app.post('/api/clients', async (req, res) => {
  try {
    const { config, mappings } = req.body;
    
    // Validate required fields
    if (!config.clientName || !config.clientCode || !config.targetModel || !config.sourceTable) {
      return res.status(400).json({ error: 'Missing required configuration fields' });
    }
    
    // Generate YAML content
    const yamlContent = generateClientMappingYAML(config, mappings);
    
    // Write YAML file (for documentation/reference)
    const filename = `${config.clientCode.toLowerCase()}.yml`;
    const filepath = path.join(CLIENT_MAPPINGS_PATH, filename);
    await fs.writeFile(filepath, yamlContent, 'utf-8');
    
    // Update dbt_project.yml with the new mapping
    await updateDbtProjectYaml(config, mappings);
    
    // Git operations
    try {
      await git.add([
        `models/staging/client_mappings/${filename}`,
        'dbt_project.yml'
      ]);
      
      await git.commit(
        `Add client mapping for ${config.clientName}\n\n` +
        `- Client: ${config.clientName} (${config.clientCode})\n` +
        `- Target model: ${config.targetModel}\n` +
        `- Source: ${config.sourceTable}\n` +
        `- Created via Client Mapping Portal`
      );
      
      // Push to remote
      console.log('  ⬆️  Pushing to remote...');
      await git.push('origin', 'main');
      console.log('  ✅ Pushed to origin/main');
      
      res.json({
        success: true,
        message: 'Client mapping created successfully and pushed to remote',
        prNumber: 'N/A', // Would be generated by CI/CD
        filename
      });
    } catch (gitError) {
      console.error('Git error:', gitError);
      // Still return success if file was created
      res.json({
        success: true,
        message: 'Client mapping created (git commit failed)',
        filename,
        warning: 'Could not commit to git'
      });
    }
  } catch (error) {
    console.error('Error creating client mapping:', error);
    res.status(500).json({ error: 'Failed to create client mapping', details: error.message });
  }
});

// Reset demo data - removes test clients and keeps only GLOBEX and WAYNE
app.post('/api/reset-demo', async (req, res) => {
  try {
    console.log('🔄 Resetting demo data...');
    
    // Define the base clients to keep (GLOBEX and WAYNE)
    const baseClients = [
      {
        client_code: 'GLOBEX',
        client_name: 'Globex Corporation',
        source_table: 'globex_staff_records',
        target_model: 'dim_candidate',
        field_mappings: {
          candidate_id: 'staff_id',
          full_name: 'full_name',
          email: 'work_email',
          phone_number: 'phone',
          hire_date: 'onboard_date',
          hourly_rate: 'pay_rate',
          client_code: "'GLOBEX'"
        }
      },
      {
        client_code: 'WAYNE',
        client_name: 'Wayne Enterprises',
        source_table: 'wayne_enterprises_workers',
        target_model: 'dim_candidate',
        field_mappings: {
          candidate_id: 'worker_id',
          full_name: "first_name || ' ' || last_name",
          email: 'email',
          phone_number: 'contact_phone',
          hire_date: 'hire_date',
          hourly_rate: 'hourly_wage',
          client_code: "'WAYNE'"
        }
      }
    ];
    
    // Update dbt_project.yml to only include base clients
    const projectYmlPath = path.join(DBT_PROJECT_PATH, 'dbt_project.yml');
    const content = await fs.readFile(projectYmlPath, 'utf-8');
    const dbtProject = yaml.load(content);
    
    // Reset client_mappings to base clients only
    if (!dbtProject.vars) {
      dbtProject.vars = {};
    }
    dbtProject.vars.client_mappings = baseClients;
    
    // Write back to file
    const yamlContent = yaml.dump(dbtProject, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });
    
    await fs.writeFile(projectYmlPath, yamlContent, 'utf-8');
    
    // Remove all client mapping YAML files except globex.yml and wayne.yml
    const files = await fs.readdir(CLIENT_MAPPINGS_PATH);
    const yamlFiles = files.filter(f => f.endsWith('.yml'));
    
    const filesToKeep = ['globex.yml', 'wayne.yml'];
    const filesToDelete = yamlFiles.filter(f => !filesToKeep.includes(f));
    
    for (const file of filesToDelete) {
      await fs.unlink(path.join(CLIENT_MAPPINGS_PATH, file));
      console.log(`  ✓ Deleted ${file}`);
    }
    
    // Git operations
    try {
      await git.add([
        'dbt_project.yml',
        'models/staging/client_mappings/*'
      ]);
      
      await git.commit(
        '🔄 Reset demo data to base configuration\n\n' +
        '- Removed test client mappings (ACME, ACME_2, ACME_3, etc.)\n' +
        '- Kept base clients: GLOBEX, WAYNE\n' +
        '- Ready for demo with fresh ACME onboarding'
      );
      
      // Push to remote
      console.log('  ⬆️  Pushing to remote...');
      await git.push('origin', 'main');
      console.log('  ✅ Pushed to origin/main');
      
      res.json({
        success: true,
        message: 'Demo data reset successfully and pushed to remote',
        remainingClients: baseClients.map(c => c.client_code),
        deletedFiles: filesToDelete
      });
    } catch (gitError) {
      console.error('Git error during reset:', gitError);
      res.json({
        success: true,
        message: 'Demo data reset (git commit failed)',
        warning: 'Could not commit to git',
        remainingClients: baseClients.map(c => c.client_code),
        deletedFiles: filesToDelete
      });
    }
  } catch (error) {
    console.error('Error resetting demo data:', error);
    res.status(500).json({ 
      error: 'Failed to reset demo data', 
      details: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Client Mapping API running on http://localhost:${PORT}`);
  console.log(`📁 DBT Project: ${DBT_PROJECT_PATH}`);
});


