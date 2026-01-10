# Common Search Patterns

Example regex patterns for `hound_search`. These patterns work with Hound's RE2 regex engine.

## Function Definitions

```javascript
// Find function definitions (JavaScript/TypeScript)
hound_search({ query: "function\\s+\\w+\\s*\\(", files: "*.ts" })

// Find async functions
hound_search({ query: "async\\s+function\\s+\\w+", files: "*.ts" })

// Find arrow functions assigned to const
hound_search({ query: "const\\s+\\w+\\s*=\\s*\\(.*\\)\\s*=>", files: "*.ts" })
```

## Class and Interface Patterns

```javascript
// Find class definitions
hound_search({ query: "class\\s+\\w+", files: "*.ts" })

// Find interfaces
hound_search({ query: "interface\\s+\\w+", files: "*.ts" })

// Find type aliases
hound_search({ query: "type\\s+\\w+\\s*=", files: "*.ts" })
```

## Import/Export Patterns

```javascript
// Find imports from specific package
hound_search({ query: "import.*from\\s+['\"]express", files: "*.ts" })

// Find default exports
hound_search({ query: "export\\s+default", files: "*.ts" })

// Find named exports
hound_search({ query: "export\\s+\\{", files: "*.ts" })
```

## Error Handling

```javascript
// Find try-catch blocks
hound_search({ query: "try\\s*\\{", files: "*.ts" })

// Find throw statements
hound_search({ query: "throw\\s+new\\s+\\w+Error", files: "*.ts" })

// Find error handling patterns
hound_search({ query: "catch\\s*\\(\\w+\\)", files: "*.ts" })
```

## API and HTTP Patterns

```javascript
// Find API endpoints (Express-style)
hound_search({ query: "\\.(get|post|put|delete|patch)\\s*\\(['\"]", files: "*.ts" })

// Find fetch calls
hound_search({ query: "fetch\\s*\\(", files: "*.ts" })

// Find axios usage
hound_search({ query: "axios\\.(get|post|put|delete)", files: "*.ts" })
```

## Configuration Patterns

```javascript
// Find environment variable usage
hound_search({ query: "process\\.env\\.", files: "*.ts" })

// Find config objects
hound_search({ query: "config\\s*=\\s*\\{", files: "*.ts" })

// Find dotenv usage
hound_search({ query: "dotenv\\.config", files: "*.ts" })
```

## Testing Patterns

```javascript
// Find test descriptions
hound_search({ query: "(describe|it|test)\\s*\\(['\"]", files: "*.test.ts" })

// Find expect assertions
hound_search({ query: "expect\\(.*\\)\\.", files: "*.test.ts" })

// Find mock definitions
hound_search({ query: "vi\\.(mock|fn|spyOn)", files: "*.test.ts" })
```

## Security Patterns

```javascript
// Find authentication code
hound_search({ query: "authenticate|authorize|auth", ignore_case: true })

// Find password handling
hound_search({ query: "password|secret|token", ignore_case: true })

// Find JWT usage
hound_search({ query: "jwt\\.(sign|verify|decode)", files: "*.ts" })
```

## Multi-term Search

```javascript
// Find multiple related terms (OR pattern)
hound_search({ query: "validateJWT|verifyToken|checkAuth" })

// Find function with specific parameter
hound_search({ query: "function\\s+\\w+\\(.*userId.*\\)" })
```

## Scoped Searches

```javascript
// Search only in specific repo
hound_search({ query: "TODO|FIXME", repos: "roctinam-matric" })

// Search across multiple repos
hound_search({ query: "TODO", repos: "roctinam-matric,roctinam-devops" })

// Search in Python files only
hound_search({ query: "def\\s+\\w+\\s*\\(", files: "*.py" })
```
