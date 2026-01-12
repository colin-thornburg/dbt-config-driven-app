// API service for Client Mapping Portal
const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  // Get all existing client mappings
  async getClients() {
    const response = await fetch(`${API_BASE_URL}/clients`);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
  },

  // Get available source schemas and tables
  async getSources() {
    const response = await fetch(`${API_BASE_URL}/sources`);
    if (!response.ok) throw new Error('Failed to fetch sources');
    return response.json();
  },

  // Get source schema (fields) for a specific table
  async getSourceSchema(schema, table) {
    const response = await fetch(`${API_BASE_URL}/sources/${schema}/${table}`);
    if (!response.ok) throw new Error('Failed to fetch source schema');
    return response.json();
  },

  // Submit new client mapping
  async createClientMapping(config, mappings) {
    const response = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config, mappings }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create client mapping');
    }
    
    return response.json();
  },

  // Health check
  async healthCheck() {
    try {
      const response = await fetch('http://localhost:3001/health');
      return response.ok;
    } catch {
      return false;
    }
  },

  // Reset demo data - removes test clients, keeps only GLOBEX and WAYNE
  async resetDemo() {
    const response = await fetch(`${API_BASE_URL}/reset-demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset demo data');
    }
    
    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORM ENTITY DESIGNER API
  // ═══════════════════════════════════════════════════════════════════════════

  // Get entity type definitions
  async getEntityTypes() {
    const response = await fetch(`${API_BASE_URL}/platform/entity-types`);
    if (!response.ok) throw new Error('Failed to fetch entity types');
    return response.json();
  },

  // Get cardinality types for relationships
  async getCardinalityTypes() {
    const response = await fetch(`${API_BASE_URL}/platform/cardinality-types`);
    if (!response.ok) throw new Error('Failed to fetch cardinality types');
    return response.json();
  },

  // Get available platform sources (seed files)
  async getPlatformSources() {
    const response = await fetch(`${API_BASE_URL}/platform/sources`);
    if (!response.ok) throw new Error('Failed to fetch platform sources');
    return response.json();
  },

  // Get source schema for a platform table
  async getPlatformSourceSchema(tableName) {
    const response = await fetch(`${API_BASE_URL}/platform/sources/${tableName}/schema`);
    if (!response.ok) throw new Error('Failed to fetch source schema');
    return response.json();
  },

  // Get all platform entities
  async getPlatformEntities() {
    const response = await fetch(`${API_BASE_URL}/platform/entities`);
    if (!response.ok) throw new Error('Failed to fetch platform entities');
    return response.json();
  },

  // Create a new platform entity
  async createPlatformEntity(entityData) {
    const response = await fetch(`${API_BASE_URL}/platform/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entityData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create platform entity');
    }
    
    return response.json();
  },

  // Delete a platform entity
  async deletePlatformEntity(name) {
    const response = await fetch(`${API_BASE_URL}/platform/entities/${name}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete platform entity');
    }
    
    return response.json();
  }
};


