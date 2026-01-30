# RayZ API Documentation Viewer

This document explains how to view and interact with the OpenAPI specification.

## 🚀 Quick Start (Easiest Methods)

### Method 1: PNPM Script (Recommended)

```bash
# Using pnpm (recommended for this project)
pnpm docs

# Or with npm
npm run docs

# Or with custom port
node scripts/swagger-serve.js openapi.yaml 9090
```

This will:
- Automatically convert `openapi.yaml` to JSON
- Start Swagger UI on http://localhost:9090
- Handle all dependencies automatically
- Auto-detect whether to use pnpm or npm

### Method 2: Direct Command

```bash
# With pnpm (recommended)
pnpm dlx swagger-ui-serve openapi.json

# Or with npm
npx swagger-ui-serve openapi.json

# Or specify port
pnpm dlx swagger-ui-serve -p 9090 openapi.json
```

**Note:** The script converts YAML → JSON automatically because `swagger-ui-serve` only works with JSON files.

### Method 3: Alternative HTML Viewer

```bash
# With pnpm
pnpm docs:alt

# With npm
npm run docs:alt
```

Opens http://localhost:8080/swagger-ui.html

---

## 📱 Additional Methods

### VS Code Extension

If you use VS Code:

1. Install "OpenAPI (Swagger) Editor" extension
2. Open `openapi.yaml` in VS Code
3. Right-click → "Preview Swagger"

### Online Swagger Editor

1. Go to https://editor.swagger.io/
2. File → Import File
3. Select `openapi.yaml`
4. View and test the API interactively

### Postman

1. Open Postman
2. Import → Upload Files
3. Select `openapi.yaml`
4. Postman generates a collection with all endpoints

---

## 💡 Why the Conversion?

**Problem:** `swagger-ui-serve` requires a JSON file because it uses Node's `require()` to load the spec, which only works with `.js` and `.json` files.

**Solution:** Our wrapper script (`scripts/swagger-serve.js`) automatically converts YAML to JSON before starting the server.

**Smart Detection:** The script auto-detects whether you're using pnpm or npm and uses the appropriate command.

**Benefits:**
- ✅ You can use `pnpm dlx swagger-ui-serve openapi.json`
- ✅ Or use `pnpm docs` for automatic conversion
- ✅ Works with both pnpm and npm
- ✅ Both YAML and JSON files are kept in sync
- ✅ No manual conversion needed

---

## 🔧 Troubleshooting

### Issue: Port already in use

**Problem:** Error "EADDRINUSE: address already in use :::9090"

**Solution:** Use a different port:
```bash
node scripts/swagger-serve.js openapi.yaml 9091
# Or
npx swagger-ui-serve -p 9091 openapi.json
```

### Issue: "Cannot find module 'js-yaml'"

**Problem:** Missing dependencies in scripts folder.

**Solution:** Install dependencies:
```bash
cd scripts
pnpm install  # or npm install
cd ..
```

### Issue: Changes to openapi.yaml not showing

**Problem:** JSON file is cached.

**Solution:** Delete `openapi.json` and run again:
```bash
rm openapi.json
pnpm docs  # or npm run docs
```

---

## 🎯 Package Manager Detection

The wrapper script automatically detects your package manager:

- **pnpm detected if:**
  - `pnpm-lock.yaml` exists
  - OR environment variable indicates pnpm

- **Uses `pnpm dlx`** instead of `npx`
- **Seamless experience** regardless of package manager

Example:
```bash
# Same command works for both!
pnpm docs
npm run docs
```

---

## 📖 What You Can Do with Swagger UI

### 1. Browse All Endpoints
- Organized by tags (auth, projects, game-modes, etc.)
- See all HTTP methods (GET, POST, PATCH, DELETE)
- View request/response schemas

### 2. Test API Calls
- Click "Try it out" on any endpoint
- Fill in parameters
- Execute request
- See actual response

### 3. Explore Schemas
- Click on schema names (e.g., `GameMode`)
- View all properties and types
- See validation rules and examples

### 4. Copy cURL Commands
- Execute a request
- Copy the generated cURL command
- Use in terminal or scripts

### 5. Download OpenAPI Spec
- Click "Download" in top right
- Get JSON or YAML format
- Use for code generation

---

## 🎯 Example Workflows

### Testing Project Creation

1. Start Swagger UI (Method 1)
2. Expand "projects" tag
3. Find "POST /projects"
4. Click "Try it out"
5. Enter JSON:
   ```json
   {
     "name": "Test Project",
     "description": "Testing API",
     "gameModeId": "clx123"
   }
   ```
6. Click "Execute"
7. View response with new project ID

### Viewing Game Modes

1. Find "GET /game-modes"
2. Click "Try it out"
3. Optionally add `isSystem=true` query parameter
4. Click "Execute"
5. View all available game modes

### Querying Match History

1. Find "GET /matches"
2. Click "Try it out"
3. Add filters:
   - `projectId`: Your project ID
   - `status`: "completed"
   - `limit`: 10
4. Click "Execute"
5. View match list with pagination

---

## 🛠️ Code Generation

### Generate TypeScript Client

```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./src/api-client
```

### Generate Python Client

```bash
pip install openapi-generator-cli
openapi-generator generate \
  -i openapi.yaml \
  -g python \
  -o ./python-client
```

### Generate Java Client

```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g java \
  -o ./java-client
```

### Available Generators

See all available languages:
```bash
npx @openapitools/openapi-generator-cli list
```

Popular options:
- `typescript-fetch` - TypeScript with fetch API
- `typescript-axios` - TypeScript with axios
- `javascript` - Plain JavaScript
- `python` - Python with requests
- `java` - Java client
- `go` - Go client
- `rust` - Rust client
- `php` - PHP client

---

## 📊 Understanding the Spec

### Main Sections

**Info:**
- API title, version, contact info
- Base URLs for different environments

**Tags:**
- Organize endpoints by functionality
- auth, projects, game-modes, players, teams, devices, matches

**Paths:**
- All API endpoints
- HTTP methods, parameters, request/response bodies

**Components:**
- Reusable schemas (User, Project, GameMode, etc.)
- Security schemes (cookieAuth)
- Standard responses (errors)

### Authentication

All endpoints (except `/auth/login`) require authentication:

```yaml
security:
  - cookieAuth: []
```

Session cookie is set on login and sent automatically by browser.

### Pagination

List endpoints support pagination:

```yaml
parameters:
  - name: page
    default: 1
  - name: limit
    default: 20
    maximum: 100
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🔍 Validation

### Validate OpenAPI Spec

```bash
# Using Redocly CLI
npx @redocly/cli lint openapi.yaml

# Using Spectral
npx @stoplight/spectral-cli lint openapi.yaml
```

### Common Validation Issues

- Missing required fields
- Invalid schema references
- Incorrect data types
- Missing operation IDs

---

## 🎨 Customization

### Custom Swagger UI Theme

Edit `swagger-ui.html` and add:

```html
<style>
    .swagger-ui .topbar { 
        background-color: #1a1a1a; 
    }
    .swagger-ui .info .title {
        color: #3b82f6;
    }
</style>
```

### Change Default Server

In `openapi.yaml`, modify servers section:

```yaml
servers:
  - url: http://localhost:3000/api/v1
    description: Local
  - url: https://api.rayz.example.com/v1
    description: Production
```

---

## 💡 Tips

1. **Use Tags for Navigation** - Endpoints are grouped by tags, use them to find related operations quickly

2. **Try Authentication First** - Test `/auth/login` before other endpoints to get session cookie

3. **Check Response Schemas** - Understand data structure before making requests

4. **Use Examples** - Most schemas have example values, use them as templates

5. **Save Collections** - In Postman/Insomnia, save tested requests for reuse

6. **Read Descriptions** - Each endpoint has detailed description of its behavior

7. **Check Error Responses** - See possible error codes (400, 401, 404) and their meanings

---

## 📚 Additional Resources

- **OpenAPI Specification:** https://swagger.io/specification/
- **Swagger UI Docs:** https://swagger.io/tools/swagger-ui/
- **OpenAPI Generator:** https://openapi-generator.tech/
- **Redoc:** https://redocly.com/redoc/
- **Spectral (Linting):** https://stoplight.io/open-source/spectral

---

## 🆘 Support

If you have issues with the API documentation:

1. Check this guide for solutions
2. Validate the OpenAPI spec with linter
3. Open an issue on GitHub with:
   - Which method you tried
   - Error messages
   - Screenshots if relevant

---

**Now you can easily view and interact with the RayZ API documentation!** 🎉
