import type {
	CommentCreatedWebhookPayload,
	CommentDeletedWebhookPayload,
	CommentUpdatedWebhookPayload,
	DataSourceContentUpdatedWebhookPayload,
	DataSourceCreatedWebhookPayload,
	DataSourceDeletedWebhookPayload,
	DataSourceMovedWebhookPayload,
	DataSourceSchemaUpdatedWebhookPayload,
	DataSourceUndeletedWebhookPayload,
	DatabaseContentUpdatedWebhookPayload,
	DatabaseCreatedWebhookPayload,
	DatabaseDeletedWebhookPayload,
	DatabaseMovedWebhookPayload,
	DatabaseSchemaUpdatedWebhookPayload,
	DatabaseUndeletedWebhookPayload,
	FileUploadCompletedWebhookPayload,
	FileUploadCreatedWebhookPayload,
	FileUploadExpiredWebhookPayload,
	FileUploadUploadFailedWebhookPayload,
	PageContentUpdatedWebhookPayload,
	PageCreatedWebhookPayload,
	PageDeletedWebhookPayload,
	PageLockedWebhookPayload,
	PageMovedWebhookPayload,
	PagePropertiesUpdatedWebhookPayload,
	PageTranscriptionBlockTranscriptDeletedWebhookPayload,
	PageUndeletedWebhookPayload,
	PageUnlockedWebhookPayload,
	ViewCreatedWebhookPayload,
	ViewDeletedWebhookPayload,
	ViewUpdatedWebhookPayload,
} from '@notionhq/client';
import type { Context, Env, Handler } from 'hono';
import { createNotionWebhookHandler } from './webhook.ts';

export type JsonValue =
	| null
	| boolean
	| number
	| string
	| JsonValue[]
	| { [key: string]: JsonValue };

export interface ChannelRoute<E extends Env = Env> {
	readonly method: string;
	readonly path: string;
	readonly handler: Handler<E>;
}

export interface NotionChannelOptions<E extends Env = Env> {
	/**
	 * Verification token supplied during Notion endpoint setup and later used
	 * as the HMAC signing secret. Ordinary events receive `503` while absent.
	 */
	verificationToken?: string;
	/** Optional fixed workspace id. Mismatched signed events receive `403`. */
	workspaceId?: string;
	/** Optional fixed subscription id. Mismatched signed events receive `403`. */
	subscriptionId?: string;
	/** Optional fixed integration id. Mismatched signed events receive `403`. */
	integrationId?: string;
	/** Maximum request-body size in bytes. Defaults to 1 MiB. */
	bodyLimit?: number;
	/**
	 * Handles Notion's initial unsigned verification-token delivery.
	 *
	 * This callback is setup code, not authenticated application ingress.
	 */
	verification?(input: NotionVerificationHandlerInput<E>): NotionHandlerResult;
	/** Receives every verified Notion event. */
	webhook(input: NotionWebhookHandlerInput<E>): NotionHandlerResult;
}

export interface NotionWebhookPrincipal {
	id: string;
	type: 'agent' | 'bot' | 'person';
}

type WithDocumentedAuthors<T> = T extends unknown
	? Omit<T, 'accessible_by' | 'authors'> & {
			authors: NotionWebhookPrincipal[];
			accessible_by?: NotionWebhookPrincipal[];
		}
	: never;

/** Event variants exported by the current official Notion SDK. */
export type NotionKnownWebhookEvent = WithDocumentedAuthors<
	| CommentCreatedWebhookPayload
	| CommentDeletedWebhookPayload
	| CommentUpdatedWebhookPayload
	| DataSourceContentUpdatedWebhookPayload
	| DataSourceCreatedWebhookPayload
	| DataSourceDeletedWebhookPayload
	| DataSourceMovedWebhookPayload
	| DataSourceSchemaUpdatedWebhookPayload
	| DataSourceUndeletedWebhookPayload
	| DatabaseContentUpdatedWebhookPayload
	| DatabaseCreatedWebhookPayload
	| DatabaseDeletedWebhookPayload
	| DatabaseMovedWebhookPayload
	| DatabaseSchemaUpdatedWebhookPayload
	| DatabaseUndeletedWebhookPayload
	| FileUploadCompletedWebhookPayload
	| FileUploadCreatedWebhookPayload
	| FileUploadExpiredWebhookPayload
	| FileUploadUploadFailedWebhookPayload
	| PageContentUpdatedWebhookPayload
	| PageCreatedWebhookPayload
	| PageDeletedWebhookPayload
	| PageLockedWebhookPayload
	| PageMovedWebhookPayload
	| PagePropertiesUpdatedWebhookPayload
	| PageTranscriptionBlockTranscriptDeletedWebhookPayload
	| PageUndeletedWebhookPayload
	| PageUnlockedWebhookPayload
	| ViewCreatedWebhookPayload
	| ViewDeletedWebhookPayload
	| ViewUpdatedWebhookPayload
>;

/** Verified event whose type is newer than the installed SDK. */
export interface NotionUnknownWebhookEvent {
	type: 'unknown';
	eventType: string;
	id: string;
	timestamp: string;
	workspaceId: string;
	workspaceName: string;
	subscriptionId: string;
	integrationId: string;
	authors: NotionWebhookPrincipal[];
	accessibleBy?: NotionWebhookPrincipal[];
	attemptNumber: number;
	apiVersion: string;
	/** Complete parsed payload after signature verification. */
	raw: unknown;
}

export type NotionWebhookEvent = NotionKnownWebhookEvent | NotionUnknownWebhookEvent;

export interface NotionVerificationHandlerInput<E extends Env = Env> {
	c: Context<E>;
	verificationToken: string;
}

export interface NotionWebhookHandlerInput<E extends Env = Env> {
	c: Context<E>;
	event: NotionWebhookEvent;
}

type NotionHandlerValue = undefined | JsonValue | Response;

export type NotionHandlerResult = NotionHandlerValue | Promise<NotionHandlerValue>;

/** Verified Notion ingress. */
export interface NotionChannel<E extends Env = Env> {
	readonly routes: readonly ChannelRoute<E>[];
}

/**
 * Creates one Notion webhook route.
 *
 * The channel is stateless and does not deduplicate or reorder Notion events.
 */
export function createNotionChannel<E extends Env = Env>(
	options: NotionChannelOptions<E>,
): NotionChannel<E> {
	validateOptions(options);
	return {
		routes: [
			{
				method: 'POST',
				path: '/webhook',
				handler: createNotionWebhookHandler(options),
			},
		],
	};
}

function validateOptions<E extends Env>(options: NotionChannelOptions<E>): void {
	if (!options || typeof options !== 'object') {
		throw new TypeError('createNotionChannel() requires an options object.');
	}
	if (
		options.verificationToken !== undefined &&
		(typeof options.verificationToken !== 'string' || options.verificationToken.length === 0)
	) {
		throw new TypeError('Notion verificationToken must be a non-empty string.');
	}
	if (options.verification !== undefined && typeof options.verification !== 'function') {
		throw new TypeError('Notion verification must be a function.');
	}
	if (options.verificationToken === undefined && options.verification === undefined) {
		throw new TypeError(
			'createNotionChannel() requires verificationToken or a verification handler.',
		);
	}
	if (typeof options.webhook !== 'function') {
		throw new TypeError('createNotionChannel() requires a webhook handler.');
	}
	for (const [name, value] of [
		['workspaceId', options.workspaceId],
		['subscriptionId', options.subscriptionId],
		['integrationId', options.integrationId],
	] as const) {
		if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
			throw new TypeError(`Notion ${name} must be a non-empty string.`);
		}
	}
}
