import { moduleStatus } from '../domain/modules.js';
export interface ApiResponse { status: number; body: unknown; headers?: Record<string,string> }
export function route(method: string, path: string): ApiResponse {
  if (path === '/api/v1/health' || path === '/api/v1/modules') {
    if (method !== 'GET') return {status:405,body:{error:'method_not_allowed'},headers:{Allow:'GET'}};
    return path.endsWith('/health')
      ? {status:200,body:{status:'ok',version:'0.2.0',database:'not_connected'}}
      : {status:200,body:{modules:moduleStatus()}};
  }
  return {status:404,body:{error:'not_found'}};
}
