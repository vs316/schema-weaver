// src/utils/sampleDataGenerator.ts
// Feature 5: Generate sample table data based on column types

import type { Column } from "../types";

const firstNames = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Barbara", "David", "Elizabeth", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White"
];

// const companies = [
//   "Acme Corp", "TechFlow", "DataSys", "CloudWorks", "NetVision", "ByteLabs",
//   "QuantumDev", "SynergyAI", "NovaTech", "InnovatePro", "VelocityIO", "ApexSoft"
// ];

const domains = [
  "example.com", "tech.io", "company.net", "startup.co", "business.org", "service.dev",
  "platform.app", "innovation.ai", "digital.io", "systems.cloud"
];

const loremSnippets = [
  "Lorem ipsum dolor sit amet",
  "Consectetur adipiscing elit, sed do",
  "Eiusmod tempor incididunt ut labore",
  "Et dolore magna aliqua. Ut enim",
  "Ad minim veniam, quis nostrud",
  "Exercitation ullamco laboris nisi",
  "Aliquip ex ea commodo consequat",
  "Duis aute irure dolor in reprehenderit",
  "In voluptate velit esse cillum dolore",
  "Eu fugiat nulla pariatur. Excepteur sint"
];

export function generateSampleValue(columnType: string, index: number): string | number | boolean {
  const type = columnType.toUpperCase();
  
  switch (type) {
    case "INT":
    case "BIGINT":
    case "SMALLINT":
      return Math.floor(Math.random() * 10000) + index * 1000;
    
    case "FLOAT":
    case "DOUBLE":
    case "DECIMAL":
      return (Math.random() * 10000 + index * 100).toFixed(2);
    
    case "VARCHAR":
    case "VARCHAR(255)":
      return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
    
    case "TEXT":
      return loremSnippets[index % loremSnippets.length];
    
    case "UUID":
    case "CHAR(36)":
      // Generate a pseudo UUID
      return `${Math.random().toString(36).substring(2, 10)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 14)}`;
    
    case "BOOL":
    case "BOOLEAN":
      return index % 2 === 0;
    
    case "TIMESTAMP":
    case "DATETIME":
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));
      return date.toISOString().split('T')[0];
    
    case "DATE":
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(Math.random() * 365));
      return d.toISOString().split('T')[0];
    
    case "EMAIL":
      return `${firstNames[index % firstNames.length].toLowerCase()}.${lastNames[index % lastNames.length].toLowerCase()}@${domains[index % domains.length]}`;
    
    case "URL":
      return `https://${domains[index % domains.length]}/user-${index}`;
    
    default:
      return `Sample_${index}`;
  }
}

export function generateSampleData(columns: Column[], rowCount: number = 5) {
  const rows = [];
  for (let i = 1; i <= rowCount; i++) {
    const row: Record<string, string | number | boolean> = {};
    for (const col of columns) {
      row[col.name] = generateSampleValue(col.type, i);
    }
    rows.push(row);
  }
  return rows;
}

export function formatSampleDataForDisplay(
  columns: Column[],
  rows: Array<Record<string, string | number | boolean>>
) {
  return {
    columns: columns.map(c => ({ name: c.name, type: c.type })),
    rows: rows.slice(0, 5) // Show max 5 rows
  };
}

export function sampleDataToJSON(
  _tableName: string,
  _columns: Column[],
  rows: Array<Record<string, string | number | boolean>>
): string {
  return JSON.stringify({
    table: _tableName,
    data: rows
  }, null, 2);
}

export function sampleDataToSQLInsert(
  tableName: string,
  columns: Column[],
  rows: Array<Record<string, string | number | boolean>>
): string {
  const columnNames = columns.map(c => `\`${c.name}\``).join(", ");
  
  const valueRows = rows.map(row => {
    const values = columns.map(col => {
      const val = row[col.name];
      if (val === null || val === undefined) return "NULL";
      if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
      if (typeof val === "number") return val.toString();
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(", ");
    return `(${values})`;
  }).join(",\n  ");
  
  return `INSERT INTO \`${tableName}\` (${columnNames})\nVALUES\n  ${valueRows};`;
}