import React, { useState, useEffect } from 'react';
import { api } from './api';

// Sample data representing existing client mappings
const existingClients = [
  { id: 1, name: 'Walmart', targetModel: 'dim_candidate', status: 'Active', lastUpdated: '2024-12-01' },
  { id: 2, name: 'Target Corp', targetModel: 'dim_candidate', status: 'Active', lastUpdated: '2024-11-15' },
  { id: 3, name: 'Ford Motor', targetModel: 'dim_candidate', status: 'Active', lastUpdated: '2024-10-22' },
];

// Target model schemas - what fields are required for each model
const targetModels = {
  dim_candidate: {
    name: 'dim_candidate',
    description: 'Candidate dimension table',
    fields: [
      { name: 'candidate_id', type: 'string', required: true, description: 'Unique identifier' },
      { name: 'full_name', type: 'string', required: true, description: 'Complete name' },
      { name: 'email', type: 'string', required: true, description: 'Contact email' },
      { name: 'phone_number', type: 'string', required: false, description: 'Formatted phone' },
      { name: 'hire_date', type: 'date', required: true, description: 'When placed' },
      { name: 'hourly_rate', type: 'decimal', required: false, description: 'Bill rate' },
      { name: 'client_code', type: 'string', required: true, description: 'Client identifier' },
    ]
  },
  dim_placement: {
    name: 'dim_placement',
    description: 'Placement dimension table',
    fields: [
      { name: 'placement_id', type: 'string', required: true, description: 'Unique placement ID' },
      { name: 'candidate_id', type: 'string', required: true, description: 'Reference to candidate' },
      { name: 'position_title', type: 'string', required: true, description: 'Job title' },
      { name: 'start_date', type: 'date', required: true, description: 'Placement start' },
      { name: 'end_date', type: 'date', required: false, description: 'Placement end' },
      { name: 'client_code', type: 'string', required: true, description: 'Client identifier' },
    ]
  }
};

// Simulated source schemas available in the warehouse
const availableSources = {
  acme_raw: {
    employee_feed: [
      { name: 'emp_id', type: 'varchar', sample: 'EMP-99201' },
      { name: 'fname', type: 'varchar', sample: 'John' },
      { name: 'lname', type: 'varchar', sample: 'Doe' },
      { name: 'email_address', type: 'varchar', sample: 'john.doe@acme.com' },
      { name: 'mobile', type: 'varchar', sample: '(317) 555-1234' },
      { name: 'start_dt', type: 'varchar', sample: '2024-03-15' },
      { name: 'rate_per_hour', type: 'number', sample: '45.50' },
      { name: 'dept', type: 'varchar', sample: 'Engineering' },
    ],
    contractor_data: [
      { name: 'contractor_id', type: 'varchar', sample: 'CON-001' },
      { name: 'name', type: 'varchar', sample: 'Jane Smith' },
      { name: 'contact_email', type: 'varchar', sample: 'jane@email.com' },
    ]
  },
  globex_raw: {
    staff_records: [
      { name: 'staff_id', type: 'varchar', sample: 'GLX-5001' },
      { name: 'full_name', type: 'varchar', sample: 'Robert Johnson' },
      { name: 'work_email', type: 'varchar', sample: 'rjohnson@globex.com' },
      { name: 'phone', type: 'varchar', sample: '555-0199' },
      { name: 'onboard_date', type: 'date', sample: '2024-01-10' },
      { name: 'pay_rate', type: 'decimal', sample: '52.00' },
    ]
  }
};

// Available transformation functions
const transformFunctions = [
  { name: 'CONCAT', description: 'Combine multiple fields', args: 'multiple', example: "CONCAT(field1, ' ', field2)" },
  { name: 'CAST', description: 'Convert data type', args: 'type', example: 'CAST(field AS DATE)' },
  { name: 'UPPER', description: 'Uppercase text', args: 'single', example: 'UPPER(field)' },
  { name: 'LOWER', description: 'Lowercase text', args: 'single', example: 'LOWER(field)' },
  { name: 'TRIM', description: 'Remove whitespace', args: 'single', example: 'TRIM(field)' },
  { name: 'COALESCE', description: 'First non-null value', args: 'multiple', example: 'COALESCE(field1, field2)' },
  { name: 'SUBSTRING', description: 'Extract portion', args: 'range', example: 'SUBSTRING(field, 1, 5)' },
];

// Icons as simple SVG components
const Icons = {
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Info: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  HelpCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Warning: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Database: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Code: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  GitBranch: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  ),
  Sparkles: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
      <path d="M19 13l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z" />
    </svg>
  ),
  Table: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  Edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
};

// Styles
const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#e2e8f0',
  },
  header: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '-0.02em',
  },
  logoSubtext: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '400',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(51, 65, 85, 0.5)',
    padding: '8px 16px',
    borderRadius: '24px',
    fontSize: '14px',
  },
  avatar: {
    width: '28px',
    height: '28px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 32px',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.6)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '24px 28px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardBody: {
    padding: '24px 28px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
    fontSize: '14px',
  },
  statusBadge: (status) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    background: status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 
                status === 'Draft' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(148, 163, 184, 0.15)',
    color: status === 'Active' ? '#10b981' : 
           status === 'Draft' ? '#fbbf24' : '#94a3b8',
  }),
  statusDot: (status) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: status === 'Active' ? '#10b981' : 
                status === 'Draft' ? '#fbbf24' : '#94a3b8',
  }),
  button: {
    primary: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      border: 'none',
      borderRadius: '10px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    },
    secondary: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      background: 'rgba(51, 65, 85, 0.5)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: '10px',
      color: '#e2e8f0',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    ghost: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      background: 'transparent',
      border: 'none',
      borderRadius: '8px',
      color: '#94a3b8',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  formGroup: {
    marginBottom: '24px',
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '40px',
  },
  step: (active, completed) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  stepNumber: (active, completed) => ({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    background: completed ? '#10b981' : active ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(51, 65, 85, 0.5)',
    color: active || completed ? 'white' : '#64748b',
    transition: 'all 0.3s ease',
  }),
  stepLabel: (active) => ({
    fontSize: '14px',
    fontWeight: active ? '600' : '400',
    color: active ? '#e2e8f0' : '#64748b',
  }),
  stepConnector: {
    width: '60px',
    height: '2px',
    background: 'rgba(148, 163, 184, 0.2)',
    margin: '0 8px',
  },
  mappingRow: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 80px',
    gap: '16px',
    alignItems: 'start',
    padding: '16px 0',
    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
  },
  targetField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  targetFieldName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  targetFieldType: {
    fontSize: '12px',
    color: '#64748b',
  },
  required: {
    color: '#f87171',
    marginLeft: '2px',
  },
  mappingStatus: (mapped) => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: mapped ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
    color: mapped ? '#10b981' : '#475569',
  }),
  expressionBuilder: {
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  expressionPreview: {
    marginTop: '12px',
    padding: '10px 14px',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#10b981',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  sourceFieldChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(59, 130, 246, 0.2)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#e0f2fe',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    margin: '4px',
  },
  functionChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    background: 'rgba(139, 92, 246, 0.25)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#f3e8ff',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    margin: '4px',
  },
  tooltip: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'help',
  },
  tooltipIcon: {
    color: '#64748b',
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
  },
  tooltipContent: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '13px',
    lineHeight: '1.5',
    whiteSpace: 'nowrap',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    pointerEvents: 'none',
  },
  tooltipArrow: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '6px solid rgba(15, 23, 42, 0.95)',
  },
  helperText: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  infoBox: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    fontSize: '13px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'start',
    gap: '10px',
  },
  codeBlock: {
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '12px',
    padding: '20px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#e2e8f0',
    overflow: 'auto',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  sampleTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
    fontSize: '13px',
  },
  validationItem: (success) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0',
    color: success ? '#10b981' : '#fbbf24',
  }),
  successCard: {
    textAlign: 'center',
    padding: '60px 40px',
  },
  successIcon: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
  },
  timeline: {
    textAlign: 'left',
    maxWidth: '400px',
    margin: '32px auto',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
    padding: '12px 0',
  },
  timelineDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3b82f6',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
  },
};

// Tooltip Component
function Tooltip({ children, text, maxWidth = '300px' }) {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      style={styles.tooltip}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div style={styles.tooltipIcon}>
        <Icons.HelpCircle />
      </div>
      {show && (
        <div style={{ ...styles.tooltipContent, maxWidth, whiteSpace: 'normal' }}>
          {text}
          <div style={styles.tooltipArrow} />
        </div>
      )}
    </div>
  );
}

// Info Box Component
function InfoBox({ children }) {
  return (
    <div style={styles.infoBox}>
      <div style={{ marginTop: '2px' }}>
        <Icons.Info />
      </div>
      <div>{children}</div>
    </div>
  );
}

// Dashboard Screen Component
function Dashboard({ clients, onNewMapping, onEditClient, onResetDemo }) {
  return (
    <>
      <InfoBox>
        <div>
          <strong>Welcome to the Client Mapping Portal!</strong>
          <br />
          <span style={{ fontSize: '13px', marginTop: '4px', display: 'block' }}>
            This portal generates dbt YAML configurations automatically. Each client mapping creates a config file that dbt reads at runtime to build the <code style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>stg_candidates_unioned</code> model.
            No manual SQL changes needed!
          </span>
        </div>
      </InfoBox>
      
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            <Icons.Database />
            Active Client Mappings
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={styles.button.secondary} 
              onClick={onResetDemo}
              title="Reset to demo state: Remove test clients (ACME, etc.) and keep only GLOBEX and WAYNE"
            >
              🔄 Reset Demo
            </button>
            <button 
              style={styles.button.primary} 
              onClick={onNewMapping}
              title="Start the wizard to onboard a new client"
            >
              <Icons.Plus />
              New Client Mapping
            </button>
          </div>
        </div>
      <div style={{ padding: '8px 28px 28px' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Client</th>
              <th style={styles.th}>Target Model</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Last Updated</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id} style={{ transition: 'background 0.2s' }}>
                <td style={styles.td}>
                  <span style={{ fontWeight: '500' }}>{client.name}</span>
                </td>
                <td style={styles.td}>
                  <code style={{ 
                    background: 'rgba(139, 92, 246, 0.15)', 
                    padding: '4px 10px', 
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#a78bfa'
                  }}>
                    {client.targetModel}
                  </code>
                </td>
                <td style={styles.td}>
                  <span style={styles.statusBadge(client.status)}>
                    <span style={styles.statusDot(client.status)} />
                    {client.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ color: '#94a3b8' }}>{client.lastUpdated}</span>
                </td>
                <td style={styles.td}>
                  <button style={styles.button.ghost} onClick={() => onEditClient(client)}>
                    <Icons.Edit />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

// Step Indicator Component
function StepIndicator({ currentStep, steps }) {
  return (
    <div style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div style={styles.step(currentStep === index, currentStep > index)}>
            <div style={styles.stepNumber(currentStep === index, currentStep > index)}>
              {currentStep > index ? <Icons.Check /> : index + 1}
            </div>
            <span style={styles.stepLabel(currentStep === index)}>{step}</span>
          </div>
          {index < steps.length - 1 && <div style={styles.stepConnector} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// Setup Screen Component
function SetupScreen({ config, setConfig, onNext, onCancel }) {
  const schemas = Object.keys(availableSources);
  const tables = config.sourceSchema ? Object.keys(availableSources[config.sourceSchema] || {}) : [];

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Icons.Sparkles />
          New Client Mapping
        </h2>
      </div>
      <div style={styles.cardBody}>
        <InfoBox>
          <strong>What happens next:</strong> This wizard will create a YAML configuration file in your dbt project. 
          The dbt macro will automatically read this config and include your client's data in the UNION query.
        </InfoBox>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Client Name
              <Tooltip text="The friendly name of your client. This will appear in documentation and the YAML file." />
            </label>
            <input
              type="text"
              style={styles.input}
              placeholder="e.g., Acme Corp"
              value={config.clientName}
              onChange={(e) => setConfig({ ...config, clientName: e.target.value })}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Client Code
              <Tooltip text="Short uppercase identifier used in the data. This will be stored in the client_code column in your dimension table." />
            </label>
            <input
              type="text"
              style={styles.input}
              placeholder="e.g., ACME"
              value={config.clientCode}
              onChange={(e) => setConfig({ ...config, clientCode: e.target.value.toUpperCase() })}
            />
            <span style={styles.helperText}>
              <Icons.Info />
              Will be used as: <code style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>'{config.clientCode || 'CODE'}'</code>
            </span>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Target Model
            <Tooltip text="The dbt dimension model where this client's data will be loaded. Your field mappings will transform source data to match this model's schema." />
          </label>
          <div style={{ position: 'relative' }}>
            <select
              style={styles.select}
              value={config.targetModel}
              onChange={(e) => setConfig({ ...config, targetModel: e.target.value })}
            >
              <option value="">Select a target model...</option>
              {Object.keys(targetModels).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          {config.targetModel && (
            <span style={styles.helperText}>
              <Icons.Database />
              dbt will build: <code style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>{config.targetModel}</code>
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Source Schema
              <Tooltip text="The database schema where your client's raw data lives. In this demo, it's 'raw_clients' which contains seed files. In production, this would be your staging schema with real tables." />
            </label>
            <select
              style={styles.select}
              value={config.sourceSchema}
              onChange={(e) => setConfig({ ...config, sourceSchema: e.target.value, sourceTable: '' })}
            >
              <option value="">Select source schema...</option>
              {schemas.map(schema => (
                <option key={schema} value={schema}>{schema}</option>
              ))}
            </select>
            {config.sourceSchema && (
              <span style={styles.helperText}>
                <Icons.Database />
                Schema: <code style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>{config.sourceSchema}</code>
              </span>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Source Table
              <Tooltip text="The specific table containing this client's data. dbt will use ref() to reference this table in the generated SQL." />
            </label>
            <select
              style={styles.select}
              value={config.sourceTable}
              onChange={(e) => setConfig({ ...config, sourceTable: e.target.value })}
              disabled={!config.sourceSchema}
            >
              <option value="">Select source table...</option>
              {tables.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
            {config.sourceTable && (
              <span style={styles.helperText}>
                <Icons.Table />
                dbt will query: <code style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>{'{{ ref(\'' + config.sourceTable + '\') }}'}</code>
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <button style={styles.button.secondary} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={{
              ...styles.button.primary,
              opacity: config.clientName && config.clientCode && config.targetModel && config.sourceSchema && config.sourceTable ? 1 : 0.5,
            }}
            onClick={onNext}
            disabled={!config.clientName || !config.clientCode || !config.targetModel || !config.sourceSchema || !config.sourceTable}
          >
            Next: Field Mapping
            <Icons.ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

// Expression Builder Modal
function ExpressionBuilder({ field, sourceFields, onSave, onCancel, initialExpression }) {
  const [expressionType, setExpressionType] = useState(initialExpression?.type || 'direct');
  const [selectedField, setSelectedField] = useState(initialExpression?.field || '');
  const [selectedFunction, setSelectedFunction] = useState(initialExpression?.function || '');
  const [functionArgs, setFunctionArgs] = useState(initialExpression?.args || []);
  const [staticValue, setStaticValue] = useState(initialExpression?.staticValue || '');
  const [castType, setCastType] = useState(initialExpression?.castType || 'DATE');

  const buildExpression = () => {
    if (expressionType === 'direct') {
      return selectedField;
    } else if (expressionType === 'static') {
      return `'${staticValue}'`;
    } else if (expressionType === 'function') {
      if (selectedFunction === 'CONCAT') {
        return `CONCAT(${functionArgs.filter(a => a).join(', ')})`;
      } else if (selectedFunction === 'CAST') {
        return `CAST(${functionArgs[0]} AS ${castType})`;
      } else if (['UPPER', 'LOWER', 'TRIM'].includes(selectedFunction)) {
        return `${selectedFunction}(${functionArgs[0]})`;
      } else if (selectedFunction === 'COALESCE') {
        return `COALESCE(${functionArgs.filter(a => a).join(', ')})`;
      }
    }
    return '';
  };

  const getPreviewValue = () => {
    const expr = buildExpression();
    if (!expr) return '';
    
    // Simulate some preview values
    if (expressionType === 'direct') {
      const field = sourceFields.find(f => f.name === selectedField);
      return field?.sample || '';
    } else if (expressionType === 'static') {
      return staticValue;
    } else if (selectedFunction === 'CONCAT') {
      const values = functionArgs.map(arg => {
        if (arg.startsWith("'")) return arg.replace(/'/g, '');
        const field = sourceFields.find(f => f.name === arg);
        return field?.sample || arg;
      });
      return values.join('');
    } else if (selectedFunction === 'CAST' && castType === 'DATE') {
      return '2024-03-15';
    } else if (selectedFunction === 'UPPER') {
      const field = sourceFields.find(f => f.name === functionArgs[0]);
      return (field?.sample || '').toUpperCase();
    }
    return 'Preview';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        ...styles.card,
        width: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <div style={styles.cardHeader}>
          <h3 style={{ ...styles.cardTitle, fontSize: '18px' }}>
            <Icons.Code />
            Build Expression for {field.name}
          </h3>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Expression Type</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { value: 'direct', label: 'Direct Field' },
                { value: 'function', label: 'Function' },
                { value: 'static', label: 'Static Value' },
              ].map(opt => (
                <button
                  key={opt.value}
                  style={{
                    ...styles.button.secondary,
                    background: expressionType === opt.value ? 'rgba(59, 130, 246, 0.2)' : undefined,
                    borderColor: expressionType === opt.value ? '#3b82f6' : undefined,
                  }}
                  onClick={() => setExpressionType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {expressionType === 'direct' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Select Source Field</label>
              <select
                style={styles.select}
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
              >
                <option value="">Select a field...</option>
                {sourceFields.map(f => (
                  <option key={f.name} value={f.name}>{f.name} ({f.type})</option>
                ))}
              </select>
            </div>
          )}

          {expressionType === 'static' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Static Value</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Enter a static value..."
                value={staticValue}
                onChange={(e) => setStaticValue(e.target.value)}
              />
            </div>
          )}

          {expressionType === 'function' && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Function</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {transformFunctions.map(fn => (
                    <button
                      key={fn.name}
                      style={{
                        ...styles.functionChip,
                        background: selectedFunction === fn.name ? 'rgba(139, 92, 246, 0.3)' : undefined,
                      }}
                      onClick={() => {
                        setSelectedFunction(fn.name);
                        setFunctionArgs([]);
                      }}
                      title={fn.description}
                    >
                      {fn.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedFunction === 'CONCAT' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Arguments (click to add, use quotes for literals)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {sourceFields.map(f => (
                      <button
                        key={f.name}
                        style={styles.sourceFieldChip}
                        onClick={() => setFunctionArgs([...functionArgs, f.name])}
                      >
                        {f.name}
                      </button>
                    ))}
                    <button
                      style={{ ...styles.sourceFieldChip, background: 'rgba(251, 191, 36, 0.25)', color: '#fef3c7', fontWeight: '600', borderColor: 'rgba(251, 191, 36, 0.4)' }}
                      onClick={() => setFunctionArgs([...functionArgs, "' '"])}
                    >
                      ' ' (space)
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {functionArgs.map((arg, i) => (
                      <span key={i} style={{
                        ...styles.sourceFieldChip,
                        background: 'rgba(16, 185, 129, 0.25)',
                        color: '#d1fae5',
                        fontWeight: '600',
                        borderColor: 'rgba(16, 185, 129, 0.4)',
                      }}>
                        {arg}
                        <button
                          style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', marginLeft: '4px', fontSize: '16px', fontWeight: 'bold' }}
                          onClick={() => setFunctionArgs(functionArgs.filter((_, idx) => idx !== i))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedFunction === 'CAST' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Source Field</label>
                    <select
                      style={styles.select}
                      value={functionArgs[0] || ''}
                      onChange={(e) => setFunctionArgs([e.target.value])}
                    >
                      <option value="">Select a field...</option>
                      {sourceFields.map(f => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Cast To</label>
                    <select
                      style={styles.select}
                      value={castType}
                      onChange={(e) => setCastType(e.target.value)}
                    >
                      <option value="DATE">DATE</option>
                      <option value="VARCHAR">VARCHAR</option>
                      <option value="INTEGER">INTEGER</option>
                      <option value="DECIMAL">DECIMAL</option>
                    </select>
                  </div>
                </div>
              )}

              {['UPPER', 'LOWER', 'TRIM'].includes(selectedFunction) && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Source Field</label>
                  <select
                    style={styles.select}
                    value={functionArgs[0] || ''}
                    onChange={(e) => setFunctionArgs([e.target.value])}
                  >
                    <option value="">Select a field...</option>
                    {sourceFields.map(f => (
                      <option key={f.name} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedFunction === 'COALESCE' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fields (click to add in priority order)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {sourceFields.map(f => (
                      <button
                        key={f.name}
                        style={styles.sourceFieldChip}
                        onClick={() => setFunctionArgs([...functionArgs, f.name])}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {functionArgs.map((arg, i) => (
                      <span key={i} style={{
                        ...styles.sourceFieldChip,
                        background: 'rgba(16, 185, 129, 0.25)',
                        color: '#d1fae5',
                        fontWeight: '600',
                        borderColor: 'rgba(16, 185, 129, 0.4)',
                      }}>
                        {i + 1}. {arg}
                        <button
                          style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', marginLeft: '4px', fontSize: '16px', fontWeight: 'bold' }}
                          onClick={() => setFunctionArgs(functionArgs.filter((_, idx) => idx !== i))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {buildExpression() && (
            <div style={styles.expressionPreview}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preview
              </div>
              <div style={{ marginBottom: '8px' }}>{buildExpression()}</div>
              <div style={{ fontSize: '12px', color: '#6ee7b7' }}>
                → {getPreviewValue()}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
            <button style={styles.button.secondary} onClick={onCancel}>
              Cancel
            </button>
            <button
              style={styles.button.primary}
              onClick={() => onSave({
                expression: buildExpression(),
                type: expressionType,
                field: selectedField,
                function: selectedFunction,
                args: functionArgs,
                staticValue,
                castType,
              })}
              disabled={!buildExpression()}
            >
              Apply Expression
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mapping Screen Component
function MappingScreen({ config, mappings, setMappings, onNext, onBack }) {
  const [activeBuilder, setActiveBuilder] = useState(null);
  const targetFields = targetModels[config.targetModel]?.fields || [];
  const sourceFields = availableSources[config.sourceSchema]?.[config.sourceTable] || [];
  
  const mappedCount = targetFields.filter(f => 
    mappings[f.name]?.expression || f.name === 'client_code'
  ).length;
  const requiredCount = targetFields.filter(f => f.required).length;

  const handleSimpleMapping = (targetField, sourceField) => {
    setMappings({
      ...mappings,
      [targetField]: { expression: sourceField, type: 'direct', field: sourceField }
    });
  };

  const handleExpressionSave = (targetField, expressionData) => {
    setMappings({
      ...mappings,
      [targetField]: expressionData
    });
    setActiveBuilder(null);
  };

  const allRequiredMapped = targetFields
    .filter(f => f.required && f.name !== 'client_code') // client_code is auto-populated
    .every(f => mappings[f.name]?.expression);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Icons.Table />
          Field Mapping: {config.clientName} → {config.targetModel}
        </h2>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>
          {mappedCount} / {targetFields.length} fields mapped
        </div>
      </div>
      <div style={styles.cardBody}>
        <InfoBox>
          <div>
            <strong>Map your source fields to target fields.</strong> Each mapping becomes a SELECT expression in the dbt SQL.
            <br />
            <span style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
              • <strong>Direct mapping:</strong> Simple field-to-field (e.g., emp_id → candidate_id)
              <br />
              • <strong>Expression:</strong> SQL transformations (e.g., CONCAT, CAST)
              <br />
              • <strong>Required fields</strong> marked with <span style={{ color: '#f87171' }}>*</span> must be mapped
            </span>
          </div>
        </InfoBox>
        <div style={{ marginBottom: '24px' }}>
          {targetFields.map(field => (
            <div key={field.name} style={styles.mappingRow}>
              <div style={styles.targetField}>
                <div style={styles.targetFieldName}>
                  {field.name}
                  {field.required && <span style={styles.required}>*</span>}
                  <Tooltip text={`Target field in ${config.targetModel}. ${field.description}`} />
                </div>
                <div style={styles.targetFieldType}>
                  {field.type} • {field.description}
                </div>
              </div>

              <div>
                {field.name === 'client_code' ? (
                  <div style={{
                    ...styles.expressionBuilder,
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                  }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Static Value (auto-populated)</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#10b981', marginTop: '6px' }}>
                      '{config.clientCode}'
                    </div>
                  </div>
                ) : mappings[field.name]?.expression ? (
                  <div style={styles.expressionBuilder}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '14px', color: '#e2e8f0' }}>
                        {mappings[field.name].expression}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          style={styles.button.ghost}
                          onClick={() => setActiveBuilder(field)}
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          style={{ ...styles.button.ghost, color: '#f87171' }}
                          onClick={() => {
                            const newMappings = { ...mappings };
                            delete newMappings[field.name];
                            setMappings(newMappings);
                          }}
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      style={{ ...styles.select, flex: '1', minWidth: '200px' }}
                      value=""
                      onChange={(e) => handleSimpleMapping(field.name, e.target.value)}
                    >
                      <option value="">Select source field...</option>
                      {sourceFields.map(f => (
                        <option key={f.name} value={f.name}>{f.name} ({f.type})</option>
                      ))}
                    </select>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>or</span>
                    <button
                      style={styles.button.secondary}
                      onClick={() => setActiveBuilder(field)}
                      title="Create complex SQL expressions like CONCAT, CAST, UPPER, etc."
                    >
                      <Icons.Code />
                      Build Expression
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'start', paddingTop: '8px' }}>
                <div style={styles.mappingStatus(!!mappings[field.name]?.expression || field.name === 'client_code')}>
                  {(mappings[field.name]?.expression || field.name === 'client_code') ? (
                    <Icons.Check />
                  ) : (
                    <Icons.Warning />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '12px' }}>
            Available Source Fields from {config.sourceSchema}.{config.sourceTable}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sourceFields.map(f => (
              <span key={f.name} style={styles.sourceFieldChip}>
                {f.name}
                <span style={{ color: '#3b82f6', opacity: 0.6 }}>({f.type})</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '24px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <button style={styles.button.secondary} onClick={onBack}>
            <Icons.ArrowLeft />
            Back
          </button>
          <button
            style={{
              ...styles.button.primary,
              opacity: allRequiredMapped ? 1 : 0.5,
            }}
            onClick={onNext}
            disabled={!allRequiredMapped}
          >
            Preview & Validate
            <Icons.ArrowRight />
          </button>
        </div>
      </div>

      {activeBuilder && (
        <ExpressionBuilder
          field={activeBuilder}
          sourceFields={sourceFields}
          initialExpression={mappings[activeBuilder.name]}
          onSave={(expr) => handleExpressionSave(activeBuilder.name, expr)}
          onCancel={() => setActiveBuilder(null)}
        />
      )}
    </div>
  );
}

// Preview Screen Component
function PreviewScreen({ config, mappings, onSubmit, onBack }) {
  const [isValidating, setIsValidating] = useState(true);
  const [validationResults, setValidationResults] = useState([]);
  const targetFields = targetModels[config.targetModel]?.fields || [];
  const sourceFields = availableSources[config.sourceSchema]?.[config.sourceTable] || [];

  useEffect(() => {
    // Simulate validation
    setTimeout(() => {
      setValidationResults([
        { message: 'All required fields mapped', success: true },
        { message: 'Data types compatible', success: true },
        { message: 'Sample query executed successfully', success: true },
        { message: 'No duplicate candidate_ids detected', success: true },
      ]);
      setIsValidating(false);
    }, 1500);
  }, []);

  const generateSQL = () => {
    const lines = ['SELECT'];
    targetFields.forEach((field, idx) => {
      let expression;
      if (field.name === 'client_code') {
        expression = `'${config.clientCode}'`;
      } else {
        expression = mappings[field.name]?.expression || 'NULL';
      }
      const comma = idx < targetFields.length - 1 ? ',' : '';
      lines.push(`    ${expression} AS ${field.name}${comma}`);
    });
    lines.push(`FROM {{ source('${config.sourceSchema}', '${config.sourceTable}') }}`);
    return lines.join('\n');
  };

  // Generate sample data based on mappings
  const generateSampleData = () => {
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const row = {};
      targetFields.forEach(field => {
        if (field.name === 'client_code') {
          row[field.name] = config.clientCode;
        } else if (mappings[field.name]) {
          const mapping = mappings[field.name];
          if (mapping.type === 'direct') {
            const sourceField = sourceFields.find(f => f.name === mapping.field);
            row[field.name] = sourceField?.sample || '-';
          } else if (mapping.function === 'CONCAT') {
            const values = mapping.args.map(arg => {
              if (arg.startsWith("'")) return arg.replace(/'/g, '');
              const sf = sourceFields.find(f => f.name === arg);
              return sf?.sample || arg;
            });
            row[field.name] = values.join('');
          } else if (mapping.function === 'CAST') {
            row[field.name] = '2024-03-15';
          } else {
            row[field.name] = mapping.staticValue || '-';
          }
        } else {
          row[field.name] = '-';
        }
      });
      rows.push(row);
    }
    return rows;
  };

  const sampleData = generateSampleData();

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Icons.Code />
          Preview: {config.clientName} → {config.targetModel}
        </h2>
      </div>
      <div style={styles.cardBody}>
        <InfoBox>
          <div>
            <strong>Review before submitting.</strong> This shows the exact SQL that dbt will execute and sample output data.
            <br />
            <span style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
              When you submit, a YAML file will be created at: <code style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                models/staging/client_mappings/{config.clientCode.toLowerCase()}.yml
              </code>
            </span>
          </div>
        </InfoBox>
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Generated SQL Preview
            <Tooltip text="This SQL will be added to the stg_candidates_unioned model as part of the UNION ALL query. The macro reads your YAML config and generates this at runtime." />
          </h3>
          <pre style={styles.codeBlock}>
            <code>{generateSQL()}</code>
          </pre>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Sample Output (first 3 rows)
            <Tooltip text="Preview of how your data will look after transformation. This data will flow into the dim_candidate table." />
          </h3>
          <div style={{ overflow: 'auto' }}>
            <table style={styles.sampleTable}>
              <thead>
                <tr>
                  {targetFields.map(f => (
                    <th key={f.name} style={{ ...styles.th, background: 'rgba(15, 23, 42, 0.4)' }}>
                      {f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleData.map((row, i) => (
                  <tr key={i}>
                    {targetFields.map(f => (
                      <td key={f.name} style={{ ...styles.td, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>
                        {row[f.name]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Validation Results
            <Tooltip text="Automated checks to ensure your mapping is valid before creating the dbt configuration." />
          </h3>
          <div style={{
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            padding: '16px 20px',
          }}>
            {isValidating ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(148, 163, 184, 0.3)',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Running validation checks...
              </div>
            ) : (
              validationResults.map((result, i) => (
                <div key={i} style={styles.validationItem(result.success)}>
                  {result.success ? <Icons.Check /> : <Icons.Warning />}
                  {result.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '24px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <button style={styles.button.secondary} onClick={onBack}>
            <Icons.ArrowLeft />
            Back to Mapping
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <button
              style={{
                ...styles.button.primary,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                opacity: isValidating ? 0.5 : 1,
              }}
              onClick={onSubmit}
              disabled={isValidating}
              title="Creates YAML config, updates macro, and commits to git"
            >
              <Icons.GitBranch />
              Submit for Review
            </button>
            <span style={{ fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
              Creates YAML → Updates macro → Commits to git
            </span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Success Screen Component
function SuccessScreen({ config, onDone }) {
  return (
    <div style={styles.card}>
      <div style={styles.successCard}>
        <div style={styles.successIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Mapping Submitted Successfully
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '8px' }}>
          {config.clientName} mapping has been created and committed to git
        </p>

        <div style={styles.timeline}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            What happens next
            <Tooltip text="Your configuration is now in the dbt project. Run 'dbt build' to see your client's data in the dimension table." />
          </h3>
          <div style={styles.timelineItem}>
            <div style={styles.timelineDot}>1</div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>YAML configuration created</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                File: <code style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                  models/staging/client_mappings/{config.clientCode.toLowerCase()}.yml
                </code>
              </div>
            </div>
          </div>
          <div style={styles.timelineItem}>
            <div style={styles.timelineDot}>2</div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>Macro updated with new mapping</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                The get_client_mappings() macro now includes {config.clientName}
              </div>
            </div>
          </div>
          <div style={styles.timelineItem}>
            <div style={styles.timelineDot}>3</div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>Changes committed to git</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Ready to run: <code style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>dbt build</code>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          padding: '16px 24px',
          marginTop: '24px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Git Status</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#60a5fa', fontSize: '15px' }}>
            ✓ Committed to main branch
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
            Files: {config.clientCode.toLowerCase()}.yml • get_client_mapping.sql
          </div>
        </div>

        <div style={{ 
          ...styles.infoBox, 
          marginTop: '24px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.2)'
        }}>
          <Icons.Info />
          <div>
            <strong>To see your data in Snowflake:</strong>
            <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
              <li>Open a terminal and navigate to the dbt project</li>
              <li>Run: <code style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '2px 6px', borderRadius: '4px' }}>dbt build</code></li>
              <li>Query: <code style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '2px 6px', borderRadius: '4px' }}>SELECT * FROM dim_candidate WHERE client_code = '{config.clientCode}'</code></li>
            </ol>
          </div>
        </div>

        <div style={{ marginTop: '32px' }}>
          <button style={styles.button.primary} onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function ClientMappingPortal() {
  const [screen, setScreen] = useState('dashboard');
  const [step, setStep] = useState(0);
  const [clients, setClients] = useState(existingClients);
  const [config, setConfig] = useState({
    clientName: '',
    clientCode: '',
    targetModel: '',
    sourceSchema: '',
    sourceTable: '',
  });
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);

  // Check API connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await api.healthCheck();
      setApiConnected(isConnected);
      if (isConnected) {
        loadClients();
      }
    };
    checkConnection();
  }, []);

  // Load clients from API
  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await api.getClients();
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setError('Failed to load clients from API');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Setup', 'Field Mapping', 'Preview', 'Complete'];

  const handleNewMapping = () => {
    setConfig({
      clientName: '',
      clientCode: '',
      targetModel: '',
      sourceSchema: '',
      sourceTable: '',
    });
    setMappings({});
    setStep(0);
    setScreen('wizard');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add client_code mapping
      const finalMappings = {
        ...mappings,
        client_code: { expression: `'${config.clientCode}'`, type: 'static', staticValue: config.clientCode }
      };
      
      // Submit to API
      const result = await api.createClientMapping(config, finalMappings);
      
      console.log('Client mapping created:', result);
      
      // Reload clients list
      await loadClients();
      
      setStep(3);
    } catch (err) {
      console.error('Failed to submit mapping:', err);
      setError(err.message || 'Failed to create client mapping');
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setScreen('dashboard');
    setStep(0);
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset demo data?\n\nThis will:\n• Remove all test clients (ACME, ACME_2, ACME_3, etc.)\n• Keep only GLOBEX and WAYNE\n• Commit changes to Git\n\nContinue?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.resetDemo();
      console.log('Demo reset:', result);
      
      // Reload clients list
      await loadClients();
      
      alert(`✅ Demo reset successful!\n\nRemaining clients: ${result.remainingClients.join(', ')}\nDeleted: ${result.deletedFiles.length} file(s)`);
    } catch (err) {
      console.error('Failed to reset demo:', err);
      setError(err.message || 'Failed to reset demo data');
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Icons.Database />
          </div>
          <div>
            <div style={styles.logoText}>Client Mapping Portal</div>
            <div style={styles.logoSubtext}>Config-Driven Data Platform</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: apiConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderRadius: '20px',
            fontSize: '12px',
            color: apiConnected ? '#10b981' : '#ef4444'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: apiConnected ? '#10b981' : '#ef4444'
            }} />
            {apiConnected ? 'API Connected' : 'API Offline'}
          </div>
          <div style={styles.userBadge}>
            <div style={styles.avatar}>DA</div>
            <span>Data Analyst</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {screen === 'dashboard' && (
          <Dashboard
            clients={clients}
            onNewMapping={handleNewMapping}
            onEditClient={(client) => console.log('Edit', client)}
            onResetDemo={handleResetDemo}
          />
        )}

        {screen === 'wizard' && (
          <>
            <StepIndicator currentStep={step} steps={steps} />
            
            {step === 0 && (
              <SetupScreen
                config={config}
                setConfig={setConfig}
                onNext={() => setStep(1)}
                onCancel={() => setScreen('dashboard')}
              />
            )}

            {step === 1 && (
              <MappingScreen
                config={config}
                mappings={mappings}
                setMappings={setMappings}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}

            {step === 2 && (
              <PreviewScreen
                config={config}
                mappings={mappings}
                onSubmit={handleSubmit}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && (
              <SuccessScreen
                config={config}
                onDone={handleDone}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
