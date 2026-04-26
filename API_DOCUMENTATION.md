# Joan Healthcare OS - Comprehensive API Documentation

This document outlines all API endpoints available in the Joan Healthcare OS system, organized by role and functionality.

## Authentication & Authorization

All endpoints require authentication header:
```
Authorization: Bearer <token>
```

## Super Admin APIs

### Tenants Management
- `GET /api/tenants` - List all tenants with filtering
- `POST /api/tenants` - Create new tenant
- `PUT /api/tenants?id=<id>` - Update tenant
- `DELETE /api/tenants?id=<id>` - Delete tenant
- `GET /api/tenants?stats=true` - Get tenant statistics
- `GET /api/tenants?usage=true` - Get usage statistics

### System Management
- `GET /api/system/health` - System health status
- `GET /api/platform/settings` - Get platform settings
- `PUT /api/platform/settings` - Update platform settings

### Analytics
- `GET /api/analytics/global` - Global platform analytics
- `GET /api/analytics/role-based?roleId=<id>` - Role-based analytics
- `GET /api/audit-logs` - Query audit logs

### Roles & Permissions
- `GET /api/roles/management` - List all roles
- `POST /api/roles/management` - Create new role
- `GET /api/permissions` - List all permissions
- `POST /api/permissions` - Create permission
- `GET /api/permissions?roleId=<id>` - Get role permissions

### Compliance
- `GET /api/compliance/data` - Compliance status
- `GET /api/compliance/data?category=metrics` - Compliance metrics
- `GET /api/compliance/data?category=risks` - Risk assessment

## Hospital Admin APIs

### Users Management
- `GET /api/super-admin/users` - List all users
- `POST /api/super-admin/users` - Create user
- `PUT /api/super-admin/users?id=<id>` - Update user
- `DELETE /api/super-admin/users?id=<id>` - Delete user

### Hospital Analytics
- `GET /api/analytics/hospital-admin` - Hospital-specific analytics

## Clinical Staff APIs

### Doctor Analytics
- `GET /api/analytics/doctor` - Doctor dashboard analytics

### Nurse Analytics
- `GET /api/analytics/nurse` - Nurse dashboard analytics

### Lab Technician Analytics
- `GET /api/analytics/lab` - Lab dashboard analytics

### Pharmacist Analytics
- `GET /api/analytics/pharmacy` - Pharmacy dashboard analytics

### Receptionist Analytics
- `GET /api/analytics/receptionist` - Receptionist dashboard analytics

## Patient APIs

### Patient Analytics
- `GET /api/analytics/patient` - Patient portal analytics

## Accounting APIs
- `GET /api/analytics/accountant` - Accounting dashboard

## Global APIs

### Health Check
- `GET /api/health` - System health status

## Query Parameters

### Pagination
- `limit` (default: 50) - Items per page
- `offset` (default: 0) - Pagination offset

### Filtering
Common filters available on list endpoints:
- `search` - Text search
- `status` - Filter by status
- `dateFrom` - Start date filter
- `dateTo` - End date filter
- `role` - Filter by role
- `category` - Filter by category

### Statistics
- `?stats=true` - Get statistics instead of list
- `?usage=true` - Get usage metrics

## Response Format

### Success Response
```json
{
  "data": {...},
  "timestamp": "2024-04-26T12:00:00Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2024-04-26T12:00:00Z"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error
- `503` - Service Unavailable

## Rate Limiting

Default rate limits:
- 1000 requests per minute for authenticated users
- 100 requests per minute for unauthenticated requests

## CORS

Cross-Origin Resource Sharing is enabled for:
- All authenticated requests
- Specific domains in production

## WebSocket Endpoints

Real-time data available via WebSocket at:
- `wss://api.joanhealthcare.com/ws/notifications` - Real-time notifications
- `wss://api.joanhealthcare.com/ws/analytics` - Live analytics streaming

## Testing

### cURL Examples

List all tenants:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tenants
```

Create new tenant:
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Hospital","slug":"new-hosp","plan":"Premium"}' \
  http://localhost:3000/api/tenants
```

Get system health:
```bash
curl http://localhost:3000/api/health
```

## Deprecation Notices

None currently. All APIs are actively maintained.

## Future Endpoints

Planned for future releases:
- GraphQL API
- WebRTC endpoints for telemedicine
- Advanced reporting API
- Custom workflow API

