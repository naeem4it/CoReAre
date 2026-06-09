const fs = require('fs');
const path = require('path');

const BACKEND_API_DIR = path.join(__dirname, '../DBARc-backend/src/api');
const FRONTEND_TYPES_DIR = path.join(__dirname, 'src/types/generated');

// Ensure output directory exists
fs.mkdirSync(FRONTEND_TYPES_DIR, { recursive: true });

// Helper to convert string to PascalCase
function toPascalCase(str) {
  if (!str) return '';
  return str
    .split(/[-_:]/)
    .filter(Boolean)
    .map(word => {
      const upper = word.toUpperCase();
      if (['COD', 'TPL', 'API'].includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

// Map schema name to target typescript import/type name
function getTargetTypeName(targetStr) {
  if (targetStr.startsWith('plugin::users-permissions.user')) {
    return 'User';
  }
  if (targetStr.startsWith('plugin::users-permissions.role')) {
    return 'Role';
  }
  const parts = targetStr.split('.');
  const modelName = parts[parts.length - 1];
  return toPascalCase(modelName);
}

// Helper to get TS type from Strapi attribute type
function getTsType(attrName, attr, imports) {
  const type = attr.type;
  if (type === 'relation') {
    const targetType = getTargetTypeName(attr.target);
    if (targetType) {
      imports.add(targetType);
    }
    const isArray = ['oneToMany', 'manyToMany'].includes(attr.relation);
    return isArray ? `${targetType}[]` : `${targetType} | null`;
  }

  switch (type) {
    case 'string':
    case 'text':
    case 'uid':
    case 'email':
    case 'password':
      return 'string';
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
    case 'time':
    case 'timestamp':
      return 'string';
    case 'enumeration':
      return attr.enum.map(val => `'${val}'`).join(' | ');
    case 'json':
      return 'any';
    case 'media':
      return 'any';
    default:
      return 'any';
  }
}

// Helper to generate full TS content with the 10 required types
function generateEntityTypes(typeName, fieldsList, importStatements) {
  return `// Generated automatically from Strapi Schema. Do not edit manually.
${importStatements}
export interface ${typeName} {
  id: number;
  documentId: string;
${fieldsList.join('\n')}
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Create${typeName}Request {
${fieldsList.filter(f => !f.includes('createdAt') && !f.includes('updatedAt') && !f.includes('publishedAt') && !f.includes('documentId')).join('\n')}
}

export interface Update${typeName}Request extends Partial<Create${typeName}Request> {}

export interface ${typeName}Response {
  data: ${typeName};
  meta: ${typeName}Meta;
}

export interface ${typeName}CollectionResponse {
  data: ${typeName}[];
  meta: ${typeName}Meta;
}

export interface ${typeName}Filters {
  [key: string]: any;
}

export interface ${typeName}QueryParams {
  populate?: string | string[] | object;
  fields?: string | string[];
  filters?: ${typeName}Filters;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
}

export interface ${typeName}PathParams {
  id?: string | number;
  documentId?: string;
}

export interface ${typeName}Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ${typeName}Meta {
  pagination?: ${typeName}Pagination;
}

export interface ${typeName}Error {
  status: number;
  name: string;
  message: string;
  details?: any;
}
`;
}

// 1. Scan DBARc-backend/src/api for all schemas
const apiDirs = fs.readdirSync(BACKEND_API_DIR);
const schemas = [];

apiDirs.forEach(dir => {
  const contentTypesPath = path.join(BACKEND_API_DIR, dir, 'content-types');
  if (fs.existsSync(contentTypesPath)) {
    const subDirs = fs.readdirSync(contentTypesPath);
    subDirs.forEach(subDir => {
      const schemaJsonPath = path.join(contentTypesPath, subDir, 'schema.json');
      if (fs.existsSync(schemaJsonPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(schemaJsonPath, 'utf8'));
          schemas.push({
            apiName: dir,
            contentTypeName: subDir,
            schema: content
          });
        } catch (e) {
          console.error(`Error parsing schema for ${dir}/${subDir}:`, e);
        }
      }
    });
  }
});

console.log(`Found ${schemas.length} schemas in backend api directory.`);

// Build a map from PascalCase type names to original kebab-case schema names
const typeToFileMap = {
  'User': 'user',
  'Role': 'role'
};
schemas.forEach(item => {
  const singularName = item.schema.info.singularName;
  const typeName = toPascalCase(singularName);
  typeToFileMap[typeName] = singularName;
});

// 2. Generate type files for all api components
schemas.forEach(item => {
  const { apiName, contentTypeName, schema } = item;
  const singularName = schema.info.singularName;
  const typeName = toPascalCase(singularName);
  const attributes = schema.attributes || {};

  const imports = new Set();
  const fields = [];

  Object.entries(attributes).forEach(([name, attr]) => {
    const tsType = getTsType(name, attr, imports);
    const isRequired = attr.required ? '' : '?';
    fields.push(`  ${name}${isRequired}: ${tsType};`);
  });

  let importStatements = '';
  imports.forEach(imp => {
    if (imp !== typeName) {
      const fileName = typeToFileMap[imp] || imp.toLowerCase();
      importStatements += `import { ${imp} } from './${fileName}.types';\n`;
    }
  });

  const fileContent = generateEntityTypes(typeName, fields, importStatements);
  const fileName = `${singularName}.types.ts`;
  const filePath = path.join(FRONTEND_TYPES_DIR, fileName);
  fs.writeFileSync(filePath, fileContent, 'utf8');
  console.log(`Generated types file: ${fileName}`);
});

// 3. Generate Role types
const roleFields = [
  '  name: string;',
  '  description?: string;',
  '  type?: string;'
];
const roleTypesContent = generateEntityTypes('Role', roleFields, '');
fs.writeFileSync(path.join(FRONTEND_TYPES_DIR, 'role.types.ts'), roleTypesContent, 'utf8');
console.log('Generated types file: role.types.ts');

// 4. Generate User types
const userFields = [
  '  username: string;',
  '  email: string;',
  '  provider?: string;',
  '  confirmed?: boolean;',
  '  blocked?: boolean;',
  '  fullName?: string;',
  '  businessName?: string;',
  '  role?: Role | null;'
];
const userImports = `import { Role } from './role.types';\n`;
const userTypesContent = generateEntityTypes('User', userFields, userImports);
fs.writeFileSync(path.join(FRONTEND_TYPES_DIR, 'user.types.ts'), userTypesContent, 'utf8');
console.log('Generated types file: user.types.ts');

console.log('All schemas generated successfully!');
