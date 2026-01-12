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

// Platform Entity paths
const PLATFORM_DEMO_SEEDS_PATH = path.join(DBT_PROJECT_PATH, 'seeds', 'platform_demo');
const PLATFORM_MODELS_PATH = path.join(DBT_PROJECT_PATH, 'models', 'platform_demo');

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

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM ENTITY DESIGNER API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Entity type definitions with their control fields
const ENTITY_TYPES = {
  dimension: {
    name: 'Dimension',
    description: 'Slowly Changing Dimension (SCD Type 2) with automatic surrogate keys and validity tracking',
    controlFields: ['_surrogate_key', '_valid_from', '_valid_to', '_is_current', '_loaded_at', '_source_schema', '_model_name', '_dbt_run_id'],
    icon: '📊',
    color: '#4F46E5'
  },
  fact: {
    name: 'Fact Table',
    description: 'Transactional fact table with CDC tracking and incremental processing support',
    controlFields: ['_transaction_time', '_ingestion_time', '_source_system', '_loaded_at', '_source_schema', '_model_name', '_dbt_run_id'],
    icon: '📈',
    color: '#059669'
  },
  bridge: {
    name: 'Bridge Table',
    description: 'Many-to-many relationship bridge with link validity tracking',
    controlFields: ['_relationship_created_at', '_is_active', '_loaded_at', '_source_schema', '_model_name', '_dbt_run_id'],
    icon: '🔗',
    color: '#D97706'
  },
  snapshot: {
    name: 'Snapshot',
    description: 'Point-in-time snapshot for tracking historical state',
    controlFields: ['_snapshot_date', '_snapshot_timestamp', '_loaded_at', '_source_schema', '_model_name', '_dbt_run_id'],
    icon: '📸',
    color: '#7C3AED'
  },
  staging: {
    name: 'Staging',
    description: 'Minimal transformation layer with basic lineage tracking',
    controlFields: ['_layer', '_loaded_at', '_source_schema', '_model_name', '_dbt_run_id'],
    icon: '📥',
    color: '#6B7280'
  }
};

// Relationship cardinality types
const CARDINALITY_TYPES = [
  { value: 'one_to_one', label: 'One-to-One (1:1)', description: 'Each record in A relates to exactly one record in B' },
  { value: 'one_to_many', label: 'One-to-Many (1:N)', description: 'Each record in A can relate to multiple records in B' },
  { value: 'many_to_one', label: 'Many-to-One (N:1)', description: 'Multiple records in A relate to one record in B' },
  { value: 'many_to_many', label: 'Many-to-Many (N:M)', description: 'Multiple records in A relate to multiple records in B (requires bridge table)' }
];

// Get entity type definitions
app.get('/api/platform/entity-types', (req, res) => {
  res.json(ENTITY_TYPES);
});

// Get cardinality types
app.get('/api/platform/cardinality-types', (req, res) => {
  res.json(CARDINALITY_TYPES);
});

// Get available platform sources (seed files)
app.get('/api/platform/sources', async (req, res) => {
  try {
    const seedFiles = await fs.readdir(PLATFORM_DEMO_SEEDS_PATH);
    const csvFiles = seedFiles.filter(f => f.endsWith('.csv'));
    
    const sources = {
      platform_demo: csvFiles.map(f => f.replace('.csv', ''))
    };
    
    res.json(sources);
  } catch (error) {
    console.error('Error reading platform sources:', error);
    res.status(500).json({ error: 'Failed to read platform sources' });
  }
});

// Get source schema (columns) for a platform table
app.get('/api/platform/sources/:table/schema', async (req, res) => {
  try {
    const { table } = req.params;
    const csvPath = path.join(PLATFORM_DEMO_SEEDS_PATH, `${table}.csv`);
    
    // Read the CSV header to get column names
    const content = await fs.readFile(csvPath, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Get sample data from first data row
    const sampleRow = lines[1]?.split(',').map(v => v.trim()) || [];
    
    // Infer data types from sample values
    const fields = headers.map((name, idx) => {
      const sample = sampleRow[idx] || '';
      let inferredType = 'varchar';
      
      // Simple type inference
      if (/^\d+$/.test(sample)) inferredType = 'integer';
      else if (/^\d+\.\d+$/.test(sample)) inferredType = 'decimal';
      else if (/^\d{4}-\d{2}-\d{2}/.test(sample)) inferredType = 'timestamp';
      else if (sample === 'true' || sample === 'false') inferredType = 'boolean';
      
      return {
        name,
        type: inferredType,
        sample,
        nullable: true
      };
    });
    
    res.json(fields);
  } catch (error) {
    console.error('Error reading platform source schema:', error);
    res.status(500).json({ error: 'Failed to read source schema' });
  }
});

// Get existing platform entities (by reading model YAML)
app.get('/api/platform/entities', async (req, res) => {
  try {
    // Check if platform_demo.yml exists
    const ymlPath = path.join(PLATFORM_MODELS_PATH, 'platform_demo.yml');
    
    try {
      const content = await fs.readFile(ymlPath, 'utf-8');
      const data = yaml.load(content);
      
      const entities = (data.models || []).map(model => ({
        name: model.name,
        description: model.description,
        entityType: model.meta?.platform?.entity_type || 'unknown',
        primaryKey: model.meta?.platform?.primary_key,
        relationships: model.meta?.platform?.relationships || [],
        columns: model.columns?.map(c => c.name) || []
      }));
      
      res.json(entities);
    } catch (e) {
      // No entities file yet
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading platform entities:', error);
    res.status(500).json({ error: 'Failed to read platform entities' });
  }
});

// Helper to generate SQL model for platform entity
function generatePlatformModelSQL(entity) {
  const { entityType, modelName, sourceTable, primaryKey, columns, relationships, cdcConfig } = entity;
  
  let platformParams = [`entity_type='${entityType}'`];
  
  if (entityType === 'dimension') {
    platformParams.push(`primary_key='${primaryKey}'`);
    if (cdcConfig?.sourceColumn) {
      platformParams.push(`source_cdc_column='${cdcConfig.sourceColumn}'`);
    }
  } else if (entityType === 'fact') {
    if (cdcConfig?.transactionTimeColumn) {
      platformParams.push(`transaction_time_column='${cdcConfig.transactionTimeColumn}'`);
    }
    if (cdcConfig?.ingestionTimeColumn) {
      platformParams.push(`ingestion_time_column='${cdcConfig.ingestionTimeColumn}'`);
    }
    if (cdcConfig?.sourceSystem) {
      platformParams.push(`source_system='${cdcConfig.sourceSystem}'`);
    }
  }
  
  // Build column selections
  const columnSelections = columns.map(col => {
    if (col.expression && col.expression !== col.sourceColumn) {
      return `    ${col.expression} AS ${col.targetColumn}`;
    }
    return `    ${col.sourceColumn}`;
  }).join(',\n');
  
  // Generate relationship comments
  let relationshipComments = '';
  if (relationships && relationships.length > 0) {
    relationshipComments = '\n    -- Relationships (defined in schema.yml)\n' +
      relationships.map(r => `    -- ${r.joinKey} -> ${r.targetEntity} (${r.cardinality})`).join('\n') + '\n';
  }
  
  const sql = `{{
    config(
        materialized='${ entityType === 'fact' ? 'incremental' : 'table' }',
        ${entityType === 'fact' ? "unique_key='" + primaryKey + "'," : ''}
        tags=['platform_demo', '${entityType}']
    )
}}

{#
    ════════════════════════════════════════════════════════════════════════════
    ${entityType.toUpperCase()}: ${modelName}
    ════════════════════════════════════════════════════════════════════════════
    
    Generated by Platform Entity Designer
    Created: ${new Date().toISOString()}
    
    This model uses the Platform Entity pattern which automatically injects
    control fields based on the entity type (${entityType}).
    
    ════════════════════════════════════════════════════════════════════════════
#}

{{ platform_entity(
    ${platformParams.join(',\n    ')}
) }}

SELECT${relationshipComments}
${columnSelections}

FROM {{ ref('${sourceTable}') }}
${entityType === 'fact' ? `
{% if is_incremental() %}
    WHERE ${cdcConfig?.transactionTimeColumn || 'updated_at'} > (SELECT MAX(_transaction_time) FROM {{ this }})
{% endif %}
` : ''}
{{ platform_entity_end() }}
`;
  
  return sql;
}

// Helper to generate schema YAML for platform entity
function generatePlatformEntityYAML(entity) {
  const { entityType, modelName, description, primaryKey, columns, relationships, cdcConfig } = entity;
  
  // Build platform meta section
  const platformMeta = {
    entity_type: entityType,
    primary_key: primaryKey
  };
  
  if (entityType === 'dimension') {
    platformMeta.scd_type = 2;
    platformMeta.track_changes_on = columns
      .filter(c => c.trackChanges)
      .map(c => c.targetColumn || c.sourceColumn);
  }
  
  if (entityType === 'fact' && cdcConfig) {
    platformMeta.cdc_config = {
      transaction_time_column: cdcConfig.transactionTimeColumn,
      ingestion_time_column: cdcConfig.ingestionTimeColumn,
      source_system: cdcConfig.sourceSystem
    };
  }
  
  if (relationships && relationships.length > 0) {
    platformMeta.relationships = relationships.map(r => ({
      target: r.targetEntity,
      join_key: r.joinKey,
      cardinality: r.cardinality,
      required: r.required || false,
      description: r.description || `Relationship to ${r.targetEntity}`
    }));
  }
  
  // Build column definitions
  const columnDefs = columns.map(col => {
    const colDef = {
      name: col.targetColumn || col.sourceColumn,
      description: col.description || `Column ${col.sourceColumn}`
    };
    
    // Add tests for primary key
    if ((col.targetColumn || col.sourceColumn) === primaryKey) {
      colDef.tests = ['unique', 'not_null'];
    }
    
    return colDef;
  });
  
  // Add control field column definitions based on entity type
  const controlFieldDefs = ENTITY_TYPES[entityType].controlFields.map(field => ({
    name: field,
    description: `Platform-managed: ${field.replace(/_/g, ' ').replace(/^_/, '')}`
  }));
  
  return {
    name: modelName,
    description: description || `${entityType} entity: ${modelName}`,
    meta: {
      platform: platformMeta
    },
    columns: [...columnDefs, ...controlFieldDefs]
  };
}

// Create new platform entity
app.post('/api/platform/entities', async (req, res) => {
  try {
    const entity = req.body;
    
    console.log('📦 Creating platform entity:', entity.modelName);
    
    // Validate required fields
    if (!entity.modelName || !entity.entityType || !entity.sourceTable || !entity.primaryKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: modelName, entityType, sourceTable, primaryKey' 
      });
    }
    
    // Generate SQL model
    const sqlContent = generatePlatformModelSQL(entity);
    const sqlFilename = `${entity.modelName}.sql`;
    const sqlPath = path.join(PLATFORM_MODELS_PATH, sqlFilename);
    
    await fs.writeFile(sqlPath, sqlContent, 'utf-8');
    console.log(`  ✓ Created model: ${sqlFilename}`);
    
    // Update or create schema YAML
    const ymlPath = path.join(PLATFORM_MODELS_PATH, 'platform_demo.yml');
    let existingYaml = { version: 2, models: [] };
    
    try {
      const existingContent = await fs.readFile(ymlPath, 'utf-8');
      existingYaml = yaml.load(existingContent);
    } catch (e) {
      // File doesn't exist yet
    }
    
    // Generate new entity YAML definition
    const entityYaml = generatePlatformEntityYAML(entity);
    
    // Check if model already exists and update, or add new
    const existingIndex = existingYaml.models.findIndex(m => m.name === entity.modelName);
    if (existingIndex >= 0) {
      existingYaml.models[existingIndex] = entityYaml;
    } else {
      existingYaml.models.push(entityYaml);
    }
    
    // Write updated YAML
    const yamlContent = yaml.dump(existingYaml, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    await fs.writeFile(ymlPath, yamlContent, 'utf-8');
    console.log('  ✓ Updated platform_demo.yml');
    
    // Git operations
    try {
      await git.add([
        `models/platform_demo/${sqlFilename}`,
        'models/platform_demo/platform_demo.yml'
      ]);
      
      await git.commit(
        `Add platform entity: ${entity.modelName}\n\n` +
        `- Type: ${entity.entityType}\n` +
        `- Source: ${entity.sourceTable}\n` +
        `- Primary Key: ${entity.primaryKey}\n` +
        `- Created via Platform Entity Designer`
      );
      
      console.log('  ⬆️  Pushing to remote...');
      await git.push('origin', 'main');
      console.log('  ✅ Pushed to origin/main');
      
      res.json({
        success: true,
        message: 'Platform entity created successfully',
        modelName: entity.modelName,
        files: [sqlFilename, 'platform_demo.yml']
      });
    } catch (gitError) {
      console.error('Git error:', gitError);
      res.json({
        success: true,
        message: 'Platform entity created (git commit failed)',
        modelName: entity.modelName,
        warning: 'Could not commit to git'
      });
    }
  } catch (error) {
    console.error('Error creating platform entity:', error);
    res.status(500).json({ 
      error: 'Failed to create platform entity', 
      details: error.message 
    });
  }
});

// Delete platform entity
app.delete('/api/platform/entities/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log('🗑️  Deleting platform entity:', name);
    
    // Delete SQL file
    const sqlPath = path.join(PLATFORM_MODELS_PATH, `${name}.sql`);
    try {
      await fs.unlink(sqlPath);
      console.log(`  ✓ Deleted ${name}.sql`);
    } catch (e) {
      // File may not exist
    }
    
    // Update schema YAML to remove the model
    const ymlPath = path.join(PLATFORM_MODELS_PATH, 'platform_demo.yml');
    try {
      const content = await fs.readFile(ymlPath, 'utf-8');
      const data = yaml.load(content);
      
      data.models = (data.models || []).filter(m => m.name !== name);
      
      const yamlContent = yaml.dump(data, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });
      
      await fs.writeFile(ymlPath, yamlContent, 'utf-8');
      console.log('  ✓ Updated platform_demo.yml');
    } catch (e) {
      // File may not exist
    }
    
    // Git operations
    try {
      await git.add([
        `models/platform_demo/${name}.sql`,
        'models/platform_demo/platform_demo.yml'
      ]);
      
      await git.commit(`Remove platform entity: ${name}`);
      await git.push('origin', 'main');
      
      res.json({ success: true, message: `Deleted ${name}` });
    } catch (gitError) {
      res.json({ success: true, message: `Deleted ${name} (git commit failed)` });
    }
  } catch (error) {
    console.error('Error deleting platform entity:', error);
    res.status(500).json({ error: 'Failed to delete platform entity' });
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


