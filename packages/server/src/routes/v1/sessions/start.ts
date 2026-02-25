import type { RouteHandler, RouteOptions } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Api } from "@browserbasehq/stagehand";
import { type FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod/v4";

import { authMiddleware } from "../../../lib/auth.js";
import { withErrorHandling } from "../../../lib/errorHandler.js";
import { getModelApiKey, getOptionalHeader } from "../../../lib/header.js";
import { error, success } from "../../../lib/response.js";
import { getSessionStore } from "../../../lib/sessionStoreManager.js";
import { AISDK_PROVIDERS } from "../../../types/model.js";

// Extended schema with custom refinement for local browser validation
const startBodySchema = z
  .preprocess((value) => {
    if (!value || typeof value !== "object") {
      return value;
    }
    const record = value as Record<string, unknown>;
    if (
      typeof record.verbose === "string" &&
      ["0", "1", "2"].includes(record.verbose)
    ) {
      return { ...record, verbose: Number(record.verbose) };
    }
    return value;
  }, Api.SessionStartRequestSchema)
  .superRefine((value, ctx) => {
    if (value.browser?.type === "local") {
      const hasConnect = Boolean(value.browser.cdpUrl);
      const hasLaunch = Boolean(value.browser.launchOptions);
      if (!hasConnect && !hasLaunch) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["browser"],
          message:
            "When browser.type is 'local', provide either browser.cdpUrl or browser.launchOptions.",
        });
      }
    }
  });

const startRouteHandler: RouteHandler = withErrorHandling(
  async (request, reply) => {
    if (!(await authMiddleware(request))) {
      return error(reply, "Unauthorized", StatusCodes.UNAUTHORIZED);
    }

    const sdkVersion = getOptionalHeader(request, "x-sdk-version");

    const clientLanguage = request.headers["x-language"] as string | undefined;
    if (
      clientLanguage &&
      !["typescript", "python", "playground"].includes(clientLanguage)
    ) {
      return error(
        reply,
        "Invalid client language header",
        StatusCodes.BAD_REQUEST,
      );
    }

    // Use the validated request body directly - fields come from Api.SessionStartRequestSchema
    const body = request.body as Api.SessionStartRequest;
    const {
      modelName,
      domSettleTimeoutMs,
      verbose,
      systemPrompt,
      browserbaseSessionCreateParams,
      selfHeal,
      waitForCaptchaSolves,
      browserbaseSessionID,
      experimental,
      browser,
    } = body;
    if (!modelName) {
      return error(reply, "Missing required model name");
    }

    // TODO: Remove this after complete AISDK migration. Validation should be done stagehand-side
    if (modelName.includes("/")) {
      const [providerName] = modelName.split("/", 1);
      if (!providerName) {
        return error(
          reply,
          `Invalid model: ${modelName}`,
          StatusCodes.BAD_REQUEST,
        );
      }
      if (!(AISDK_PROVIDERS as readonly string[]).includes(providerName)) {
        return error(
          reply,
          `Invalid provider: ${providerName}`,
          StatusCodes.BAD_REQUEST,
        );
      }
    }

    // On-premises deployment: enforce local browser type
    // All sessions run locally; no cloud platform integration
    const effectiveBrowserType = "local";
    let connectUrl: string | undefined;

    const sessionStore = getSessionStore();
    const modelApiKey = getModelApiKey(request);

    // For local browsers, use cdpUrl if provided
    if (effectiveBrowserType === "local") {
      connectUrl = browser?.cdpUrl;
    }

    const session = await sessionStore.startSession({
      browserType: effectiveBrowserType,
      connectUrl,
      browserbaseSessionID: undefined,
      browserbaseApiKey: undefined,
      browserbaseProjectId: undefined,
      modelName,
      domSettleTimeoutMs,
      verbose,
      systemPrompt,
      browserbaseSessionCreateParams: undefined,
      selfHeal,
      waitForCaptchaSolves,
      clientLanguage,
      sdkVersion,
      experimental,
      modelApiKey, // Store the API key from the request so it's available for the entire session
      localBrowserLaunchOptions:
        browser?.launchOptions || browser?.cdpUrl
          ? {
              cdpUrl: browser?.cdpUrl,
              ...(browser?.launchOptions ?? {}),
            }
          : undefined,
    });

    // For local browsers with launchOptions (no explicit cdpUrl), eagerly
    // initialize the browser so we can return the actual CDP URL
    let finalCdpUrl = connectUrl ?? session.cdpUrl ?? "";
    if (browser?.launchOptions && !browser?.cdpUrl) {
      try {
        const stagehand = await sessionStore.getOrCreateStagehand(
          session.sessionId,
          { modelApiKey },
        );
        finalCdpUrl = stagehand.connectURL();
      } catch (err) {
        request.log.error(
          {
            err,
            sessionId: session.sessionId,
            browserType: effectiveBrowserType,
            chromePathEnv: process.env.CHROME_PATH,
            launchOptions: {
              executablePath: browser.launchOptions.executablePath,
              argsCount: browser.launchOptions.args?.length ?? 0,
              headless: browser.launchOptions.headless,
              hasUserDataDir: Boolean(browser.launchOptions.userDataDir),
              port: browser.launchOptions.port,
              connectTimeoutMs: browser.launchOptions.connectTimeoutMs,
            },
          },
          "Failed to initialize local browser session in /v1/sessions/start",
        );
        throw err;
      }
    }

    return success(reply, {
      sessionId: session.sessionId,
      available: session.available,
      cdpUrl: finalCdpUrl,
    });
  },
);

const startRoute: RouteOptions = {
  method: "POST",
  url: "/sessions/start",
  schema: {
    ...Api.Operations.SessionStart,
    headers: Api.SessionHeadersSchema,
    body: startBodySchema,
    response: {
      200: Api.SessionStartResponseSchema,
    },
  } satisfies FastifyZodOpenApiSchema,
  handler: startRouteHandler,
};

export default startRoute;
