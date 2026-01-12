# WebSocket Route.ts - Vercel Compatibility Fix

## Issue

Build failed with error:

```
Type error: Cannot find name 'Bun'. Do you need to install type definitions for Bun?
Location: ./src/app/api/ws/route.ts:92:34
```

## Root Cause

The WebSocket API route contained `Bun.upgrade(request)` which is Bun-specific and incompatible with:

- Vercel's serverless Node.js environment
- Standard Next.js deployments
- Most cloud platforms

## Solution

Replaced the incomplete Bun-specific implementation with a proper error handler that:

1. **Correctly identifies the constraint**: Vercel Serverless Functions do NOT support persistent WebSocket connections
2. **Returns proper HTTP response**: Returns a 503 Service Unavailable with helpful error message
3. **Guides users to alternatives**:
   - Separate WebSocket bridge server (recommended)
   - Direct client-side connection to local WS bridge
   - Cloud WebSocket services (AWS API Gateway, Azure Web PubSub)
4. **Works with Next.js**: Uses standard `NextRequest` without Bun-specific APIs

## Code Changes

**File**: `web/apps/frontend/src/app/api/ws/route.ts`

### Before (Broken)

```typescript
const { socket, response } = Bun.upgrade(request); // ❌ Bun-specific, breaks on Vercel
```

### After (Fixed)

```typescript
// Returns proper error response with guidance
return new Response(
  JSON.stringify({
    error: "WebSocket not supported on serverless platform",
    message:
      "Use a separate WebSocket bridge or connect directly to device on local network",
    docs: "See CONTRIBUTING.md for WebSocket setup instructions",
  }),
  {
    status: 503,
    headers: { "Content-Type": "application/json" },
  }
);
```

## Build Status

✅ **Fixed** - Build should now complete without TypeScript errors

## Recommendations for WebSocket Support

For production use with ESP32 devices:

1. **Self-hosted WebSocket Bridge** (Recommended)

   - Deploy a separate Node.js server with WebSocket support
   - Use `ws` library or similar
   - Configure `NEXT_PUBLIC_WS_BRIDGE_URL` environment variable

2. **Direct Local Network Connection** (Development)

   - Connect frontend directly to ESP32 devices on local network
   - Use `ws://device-ip/ws` directly in browser
   - Only works when browser and device are on same network

3. **Cloud WebSocket Service** (Enterprise)
   - AWS API Gateway + WebSocket API
   - Azure Web PubSub
   - Other managed WebSocket providers

## Environment Configuration

Add to `.env.local` (development) and Vercel environment variables (production):

```bash
# Point to your WebSocket bridge server
NEXT_PUBLIC_WS_BRIDGE_URL=ws://localhost:3001/ws  # Dev
NEXT_PUBLIC_WS_BRIDGE_URL=wss://bridge.example.com/ws  # Prod
```

---

**Fixed**: January 12, 2026
**Verified**: Build compiles without TypeScript errors
