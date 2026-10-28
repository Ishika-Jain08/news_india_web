const lang = { name: 'language', in: 'query', schema: { type: 'string', enum: ['en', 'hi'], default: 'en' } }
const page = { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }
const limit = { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } }
const slug = { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }
const id = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }

function workflow(action: string) {
  return {
    post: {
      tags: ['Articles'],
      summary: `Workflow action: ${action}`,
      security: [{ cookieAuth: [], csrfHeader: [] }],
      parameters: [id],
      responses: {
        '200': { description: 'Updated article' },
        '403': { description: 'Role cannot perform this action' },
        '409': { description: 'Status transition is not allowed' },
      },
    },
  }
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'News India API',
    version: '1.0.0',
    description:
      'Phase 1 REST API for the News India demo. Business rules run in services. JSON files are only the repository. Demo authentication is for development, not production.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Health' },
    { name: 'Content' },
    { name: 'Auth' },
    { name: 'Dashboard' },
    { name: 'Articles' },
    { name: 'Users' },
    { name: 'Categories' },
    { name: 'Live' },
    { name: 'Media' },
    { name: 'Audit' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'ni.sid' },
      csrfHeader: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': { get: { tags: ['Health'], summary: 'API health and repository article count', responses: { '200': { description: 'Service is up' } } } },
    '/home': { get: { tags: ['Content'], summary: 'Homepage sections in one language', parameters: [lang], responses: { '200': { description: 'Homepage payload' } } } },
    '/articles': { get: { tags: ['Content'], summary: 'Published articles with filters and pagination', parameters: [lang, page, limit, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'coverage', in: 'query', schema: { type: 'string', enum: ['local', 'state', 'national'] } }, { name: 'state', in: 'query', schema: { type: 'string' } }, { name: 'city', in: 'query', schema: { type: 'string' } }, { name: 'tag', in: 'query', schema: { type: 'string' } }, { name: 'sort', in: 'query', schema: { type: 'string', enum: ['latest', 'oldest', 'views', 'title'] } }, { name: 'featured', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } }, { name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Article page' } } } },
    '/articles/{slug}': { get: { tags: ['Content'], summary: 'Published article by any translation slug', parameters: [slug, lang], responses: { '200': { description: 'Article' }, '404': { description: 'Missing or unpublished' } } } },
    '/articles/{slug}/pdf': { get: { tags: ['Content'], summary: 'PDF of a published article', parameters: [slug, lang], responses: { '200': { description: 'application/pdf' }, '404': { description: 'Missing or unpublished' } } } },
    '/articles/{id}/related': { get: { tags: ['Content'], summary: 'Related published articles', parameters: [id, lang, limit], responses: { '200': { description: 'Related articles' }, '404': { description: 'Missing or unpublished' } } } },
    '/categories': { get: { tags: ['Categories'], summary: 'Public categories', parameters: [lang], responses: { '200': { description: 'Categories' } } } },
    '/categories/{slug}/articles': { get: { tags: ['Categories'], summary: 'Published articles in a category', parameters: [slug, lang, page, limit], responses: { '200': { description: 'Article page' } } } },
    '/search': { get: { tags: ['Content'], summary: 'Search published articles', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }, lang, page, limit, { name: 'coverage', in: 'query', schema: { type: 'string' } }, { name: 'category', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Search results' }, '400': { description: 'Missing query' } } } },
    '/news/breaking': { get: { tags: ['Content'], summary: 'Published breaking articles ordered by editorial priority', parameters: [lang, page, limit], responses: { '200': { description: 'Breaking articles' } } } },
    '/news/trending': { get: { tags: ['Content'], summary: 'Published articles ranked by the documented trending score', parameters: [lang, page, limit], responses: { '200': { description: 'Trending articles' } } } },
    '/news/featured': { get: { tags: ['Content'], summary: 'Published featured articles', parameters: [lang, page, limit], responses: { '200': { description: 'Featured articles' } } } },
    '/news/top': { get: { tags: ['Content'], summary: 'Published articles ordered by view count', parameters: [lang, page, limit], responses: { '200': { description: 'Top articles' } } } },
    '/news/places': { get: { tags: ['Content'], summary: 'States and cities present in published articles', parameters: [{ name: 'coverage', in: 'query', schema: { type: 'string', enum: ['local', 'state', 'national'] } }], responses: { '200': { description: 'Place counts' } } } },
    '/live': { get: { tags: ['Live'], summary: 'Live desk payload. Empty when no stream is configured.', parameters: [lang], responses: { '200': { description: 'Live payload' } } } },
    '/live/current': { get: { tags: ['Live'], summary: 'Current live configuration for the public page', parameters: [lang], responses: { '200': { description: 'Current stream or empty state' } } } },
    '/contact': { post: { tags: ['Content'], summary: 'Store a contact message', security: [{ cookieAuth: [], csrfHeader: [] }], responses: { '201': { description: 'Stored' }, '400': { description: 'Invalid message' } } } },
    '/auth/csrf': { get: { tags: ['Auth'], summary: 'Issue a CSRF token and session cookie', responses: { '200': { description: 'Token' } } } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Demo login. Sets an HTTP-only session cookie.', responses: { '200': { description: 'User and CSRF token' }, '401': { description: 'Invalid credentials' }, '429': { description: 'Rate limited' } } } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Destroy the session', security: [{ cookieAuth: [], csrfHeader: [] }], responses: { '200': { description: 'Logged out' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: [{ cookieAuth: [] }], responses: { '200': { description: 'User' }, '401': { description: 'Signed out' } } } },
    '/admin/dashboard': { get: { tags: ['Dashboard'], summary: 'Role-scoped statistics from the repository', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Dashboard' }, '401': { description: 'Signed out' } } } },
    '/admin/articles': {
      get: { tags: ['Articles'], summary: 'Editorial article list', security: [{ cookieAuth: [] }], parameters: [page, limit, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Articles' } } },
      post: { tags: ['Articles'], summary: 'Create a draft', security: [{ cookieAuth: [], csrfHeader: [] }], responses: { '201': { description: 'Created' }, '400': { description: 'Invalid article' } } },
    },
    '/admin/articles/{id}': {
      get: { tags: ['Articles'], summary: 'Article detail and revisions', security: [{ cookieAuth: [] }], parameters: [id], responses: { '200': { description: 'Article' }, '404': { description: 'Missing' } } },
      patch: { tags: ['Articles'], summary: 'Edit an article when the role allows it', security: [{ cookieAuth: [], csrfHeader: [] }], parameters: [id], responses: { '200': { description: 'Updated' }, '403': { description: 'Forbidden' } } },
      delete: { tags: ['Articles'], summary: 'Delete an article when the role allows it', security: [{ cookieAuth: [], csrfHeader: [] }], parameters: [id], responses: { '204': { description: 'Deleted' } } },
    },
    '/admin/articles/{id}/pdf': { get: { tags: ['Articles'], summary: 'Staff PDF, including unpublished articles the user may view', security: [{ cookieAuth: [] }], parameters: [id, lang], responses: { '200': { description: 'application/pdf' } } } },
    '/admin/articles/{id}/original-pdf': { post: { tags: ['Media'], summary: 'Upload an original PDF and attach it to the article', security: [{ cookieAuth: [], csrfHeader: [] }], parameters: [id], responses: { '201': { description: 'Attached' }, '400': { description: 'Not a PDF' } } } },
    '/admin/articles/{id}/submit': workflow('submit'),
    '/admin/articles/{id}/approve': workflow('approve'),
    '/admin/articles/{id}/reject': workflow('reject'),
    '/admin/articles/{id}/publish': workflow('publish'),
    '/admin/articles/{id}/unpublish': workflow('unpublish'),
    '/admin/users': {
      get: { tags: ['Users'], summary: 'List users. Admin only.', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Users' }, '403': { description: 'Forbidden' } } },
      post: { tags: ['Users'], summary: 'Create a user. Admin only.', security: [{ cookieAuth: [], csrfHeader: [] }], responses: { '201': { description: 'Created' } } },
    },
    '/admin/users/{id}': { patch: { tags: ['Users'], summary: 'Update name, password, or active flag. Admin only.', security: [{ cookieAuth: [], csrfHeader: [] }], parameters: [id], responses: { '200': { description: 'Updated' } } } },
    '/admin/users/{id}/role': { patch: { tags: ['Users'], summary: 'Change a role. Cannot remove the last admin.', security: [{ cookieAuth: [], csrfHeader: [] }], parameters: [id], responses: { '200': { description: 'Updated' }, '409': { description: 'Last admin' } } } },
    '/admin/categories': {
      get: { tags: ['Categories'], summary: 'All categories', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Categories' } } },
      post: { tags: ['Categories'], summary: 'Create a category. Admin or editor.', security: [{ cookieAuth: [], csrfHeader: [] }], responses: { '201': { description: 'Created' } } },
    },
    '/admin/categories/{id}': {
      patch: { tags: ['Categories'], summary: 'Update a category. Admin or editor.', security: [{ cookieAuth: [], csrfHeader: [] }], parameters: [id], responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Categories'], summary: 'Delete an unused category. Admin only.', security: [{ cookieAuth: [], csrfHeader: [] }], parameters: [id], responses: { '204': { description: 'Deleted' }, '409': { description: 'Category still has articles' } } },
    },
    '/admin/live': {
      get: { tags: ['Live'], summary: 'Newsroom live settings. Admin or editor.', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Settings' } } },
      patch: { tags: ['Live'], summary: 'Validate and save a YouTube URL. Admin or editor.', security: [{ cookieAuth: [], csrfHeader: [] }], responses: { '200': { description: 'Saved' }, '400': { description: 'Invalid YouTube URL' } } },
    },
    '/admin/media': { get: { tags: ['Media'], summary: 'Media library metadata', security: [{ cookieAuth: [] }], parameters: [page, limit], responses: { '200': { description: 'Media page' } } } },
    '/admin/media/upload': { post: { tags: ['Media'], summary: 'Upload a PDF or image after content-type sniffing', security: [{ cookieAuth: [], csrfHeader: [] }], responses: { '201': { description: 'Stored' }, '400': { description: 'Rejected file' } } } },
    '/admin/media/{id}/file': { get: { tags: ['Media'], summary: 'Authorized download. Local files are not publicly served.', security: [{ cookieAuth: [] }], parameters: [id], responses: { '200': { description: 'File' }, '302': { description: 'Remote demo image' } } } },
    '/admin/media/{id}': { delete: { tags: ['Media'], summary: 'Delete an unused asset', security: [{ cookieAuth: [], csrfHeader: [] }], parameters: [id], responses: { '204': { description: 'Deleted' }, '409': { description: 'Still attached' } } } },
    '/admin/audit-logs': { get: { tags: ['Audit'], summary: 'Audit history. Admin or editor.', security: [{ cookieAuth: [] }], parameters: [page, limit], responses: { '200': { description: 'Audit page' }, '403': { description: 'Forbidden' } } } },
    '/admin/demo/reset': { post: { tags: ['Dashboard'], summary: 'Reset JSON demo data from seed. Admin only, refused in production.', security: [{ cookieAuth: [], csrfHeader: [] }], responses: { '200': { description: 'Reset' }, '403': { description: 'Forbidden' } } } },
  },
}
