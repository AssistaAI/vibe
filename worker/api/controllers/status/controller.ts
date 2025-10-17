import { BaseController } from '../baseController';
import type { ApiResponse, ControllerResponse } from '../types';
import type { RouteContext } from '../../types/route-context';
import type { PlatformStatusData } from './types';
import { BaseSandboxService } from '../../../services/sandbox/BaseSandboxService';

export class StatusController extends BaseController {
    static async getPlatformStatus(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<PlatformStatusData>>> {
        const messaging = context.config.globalMessaging ?? { globalUserMessage: '', changeLogs: '' };
        const globalUserMessage = messaging.globalUserMessage ?? '';
        const changeLogs = messaging.changeLogs ?? '';

        const data: PlatformStatusData = {
            globalUserMessage,
            changeLogs,
            hasActiveMessage: globalUserMessage.trim().length > 0,
        };

        return StatusController.createSuccessResponse(data);
    }

    static async getHealthCheck(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        _context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<{
        status: string;
        checks: {
            templates: { status: string; count?: number; error?: string };
            database: { status: string; error?: string };
            aiKeys: { status: string; configured: string[] };
            sandbox: { status: string; maxInstances: number };
        };
        timestamp: string;
    }>>> {
        const checks = {
            templates: { status: 'unknown' as string },
            database: { status: 'unknown' as string },
            aiKeys: { status: 'unknown' as string, configured: [] as string[] },
            sandbox: { status: 'unknown' as string, maxInstances: 0 },
        };

        try {
            const templatesResponse = await BaseSandboxService.listTemplates();
            if (templatesResponse.success) {
                checks.templates = {
                    status: 'healthy',
                    count: templatesResponse.count,
                };
            } else {
                checks.templates = {
                    status: 'unhealthy',
                    error: templatesResponse.error || 'Unknown error',
                };
            }
        } catch (error) {
            checks.templates = {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }

        try {
            await env.DB.prepare('SELECT 1').first();
            checks.database = { status: 'healthy' };
        } catch (error) {
            checks.database = {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }

        const configuredKeys: string[] = [];
        if (env.GOOGLE_AI_STUDIO_API_KEY && env.GOOGLE_AI_STUDIO_API_KEY.trim().length > 10) {
            configuredKeys.push('Google AI Studio');
        }
        if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 10) {
            configuredKeys.push('Anthropic');
        }
        if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 10) {
            configuredKeys.push('OpenAI');
        }

        checks.aiKeys = {
            status: configuredKeys.length > 0 ? 'healthy' : 'unhealthy',
            configured: configuredKeys,
        };

        checks.sandbox = {
            status: 'healthy',
            maxInstances: env.MAX_SANDBOX_INSTANCES ? Number(env.MAX_SANDBOX_INSTANCES) : 10,
        };

        const allHealthy =
            checks.templates.status === 'healthy' &&
            checks.database.status === 'healthy' &&
            checks.aiKeys.status === 'healthy';

        return StatusController.createSuccessResponse({
            status: allHealthy ? 'healthy' : 'degraded',
            checks,
            timestamp: new Date().toISOString(),
        });
    }
}
