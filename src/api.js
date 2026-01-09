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
  }
};


