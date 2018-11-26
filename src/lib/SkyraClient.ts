import { Collection, Webhook } from 'discord.js';
import { KlasaClient, KlasaClientOptions, Schema } from 'klasa';
import { MasterPool, R } from 'rethinkdb-ts';
import { Node } from 'veza';
import { VERSION, WEBHOOK_ERROR } from '../../config';
import { IPCMonitorStore } from './structures/IPCMonitorStore';
import { MemberGateway } from './structures/MemberGateway';
import { RawEventStore } from './structures/RawEventStore';
import { ConnectFourManager } from './util/Games/ConnectFourManager';
import { Leaderboard } from './util/Leaderboard';
import { LongLivingReactionCollector } from './util/LongLivingReactionCollector';
import { enumerable } from './util/util';

export class SkyraClient extends KlasaClient {

	/**
	 * The version of Skyra
	 */
	public version = VERSION;

	/**
	 * The loaded Leaderboard singleton instance
	 */
	public leaderboard = new Leaderboard(this);

	/**
	 * The IPC monitor store
	 */
	public ipcMonitors = new IPCMonitorStore(this);

	/**
	 * The raw event store
	 */
	public rawEvents = new RawEventStore(this);

	/**
	 * The webhook to use for the error event
	 */
	public webhookError = new Webhook(this, WEBHOOK_ERROR);

	/**
	 * The ConnectFour manager
	 */
	@enumerable(false)
	public connectFour = new ConnectFourManager(this);

	@enumerable(false)
	public usertags: Collection<string, string> = new Collection();

	@enumerable(false)
	public llrCollectors: Set<LongLivingReactionCollector> = new Set();

	/**
	 * The Veza Node
	 */
	public ipc = new Node('skyra-master')
		.on('client.connect', (client) => this.emit('verbose', `[IPC] Client Connected: ${client.name}`))
		.on('client.disconnect', (client) => this.emit('warn', `[IPC] Client Disconnected: ${client.name}`))
		.on('client.destroy', (client) => this.emit('warn', `[IPC] Client Destroyed: ${client.name}`))
		.on('client.ready', (client) => this.emit('verbose', `[IPC] Client Ready: Named ${client.name}`))
		.on('error', (error, client) => this.emit('error', `[IPC] Error from ${client.name}: ${error}`))
		.on('message', this.ipcMonitors.run.bind(this.ipcMonitors));

	public constructor(options?: KlasaClientOptions) {
		super(options);

		const { members } = this.options.gateways;
		members.schema = 'schema' in members ? members.schema : SkyraClient.defaultClientSchema;
		this.gateways.register(new MemberGateway(this, 'members', members));

		// Register the API handler
		this.registerStore(this.ipcMonitors)
			.registerStore(this.rawEvents);

		if (!options.dev) {
			this.ipc.connectTo('ny-api', 9997)
				.catch((error) => { this.console.error(error); });
		}
	}

	public async fetchTag(id: string): Promise<string> {
		// Return from cache if exists
		const cache = this.usertags.get(id);
		if (cache) return cache;

		// Fetch the user and set to cache
		const user = await this.users.fetch(id);
		this.usertags.set(user.id, user.tag);
		return user.tag;
	}

	public async fetchUsername(id: string): Promise<string> {
		const tag = await this.fetchTag(id);
		return tag.slice(0, tag.indexOf('#'));
	}

	public static defaultMemberSchema = new Schema()
		.add('points', 'Number', { configurable: false });

}

SkyraClient.defaultUserSchema
	.add('badgeList', 'String', { array: true, configurable: false })
	.add('badgeSet', 'String', { array: true, configurable: false })
	.add('bannerList', 'String', { array: true, configurable: false })
	.add('color', 'String', { configurable: false })
	.add('marry', 'User', { configurable: false })
	.add('money', 'Float', { default: 0, min: 0, max: 2147483647, configurable: false })
	.add('points', 'Float', { default: 0, min: 0, max: 2147483647, configurable: false })
	.add('reputation', 'Integer', { default: 0, min: 0, max: 32767, configurable: false })
	.add('themeLevel', 'String', { default: '1001', configurable: false })
	.add('themeProfile', 'String', { default: '0001', configurable: false })
	.add('timeDaily', 'Integer', { default: 0, configurable: false })
	.add('timeReputation', 'Integer', { default: 0, configurable: false });

SkyraClient.defaultGuildSchema
	.add('prefix', 'string', { filter: (_: KlasaClient, value: string) => value.length >= 1 && value.length <= 10 })
	.add('tags', 'any', { array: true, configurable: false })
	.add('channels', (folder) => folder
		.add('announcement', 'TextChannel')
		.add('default', 'TextChannel')
		.add('log', 'TextChannel')
		.add('messagelogs', 'TextChannel')
		.add('modlog', 'TextChannel')
		.add('nsfwmessagelogs', 'TextChannel')
		.add('roles', 'TextChannel')
		.add('spam', 'TextChannel'))
	.add('disabledChannels', 'TextChannel', { array: true })
	.add('disabledCommandsChannels', 'any', { default: {}, configurable: false })
	.add('events', (folder) => folder
		.add('banAdd', 'Boolean', { default: false })
		.add('banRemove', 'Boolean', { default: false })
		.add('memberAdd', 'Boolean', { default: false })
		.add('memberRemove', 'Boolean', { default: false })
		.add('messageDelete', 'Boolean', { default: false })
		.add('messageEdit', 'Boolean', { default: false }))
	.add('filter', (folder) => folder
		.add('level', 'Integer', { default: 0, min: 0, max: 7, configurable: false })
		.add('raw', 'String', { array: true, configurable: false }))
	.add('messages', (folder) => folder
		.add('farewell', 'String', { max: 2000 })
		.add('greeting', 'String', { max: 2000 })
		.add('join-dm', 'String', { max: 1500 })
		.add('warnings', 'Boolean', { default: false }))
	.add('stickyRoles', 'any', { array: true })
	.add('roles', (folder) => folder
		.add('admin', 'Role')
		.add('auto', 'any', { array: true })
		.add('initial', 'Role')
		.add('messageReaction', 'String', { min: 17, max: 18, configurable: false })
		.add('moderator', 'Role')
		.add('muted', 'Role')
		.add('public', 'Role', { array: true })
		.add('reactions', 'any', { array: true })
		.add('removeInitial', 'Boolean')
		.add('staff', 'Role')
		.add('subscriber', 'Role'))
	.add('selfmod', (folder) => folder
		.add('attachment', 'Boolean', { default: false })
		.add('attachmentMaximum', 'Integer', { default: 20, min: 0, max: 60 })
		.add('attachmentDuration', 'Integer', { default: 20000, min: 5000, max: 120000, configurable: false })
		.add('attachmentAction', 'Integer', { default: 0, configurable: false })
		.add('attachmentPunishmentDuration', 'Integer', { configurable: false })
		.add('capsfilter', 'Integer', { default: 0, min: 0, max: 7, configurable: false })
		.add('capsminimum', 'Integer', { default: 10, min: 0, max: 2000 })
		.add('capsthreshold', 'Integer', { default: 50, min: 0, max: 100 })
		.add('ignoreChannels', 'TextChannel', { array: true })
		.add('invitelinks', 'Boolean', { default: false })
		.add('nmsthreshold', 'Integer', { default: 20, min: 10, max: 100 })
		.add('raid', 'Boolean')
		.add('raidthreshold', 'Integer', { default: 10, min: 2, max: 50 }))
	.add('no-mention-spam', (folder) => folder
		.add('enabled', 'Boolean', { default: false })
		.add('alerts', 'Boolean', { default: false })
		.add('mentionsAllowed', 'Integer', { default: 20 })
		.add('timePeriod', 'Integer', { default: 8 }))
	.add('social', (folder) => folder
		.add('achieve', 'Boolean', { default: false })
		.add('achieveMessage', 'String')
		.add('boost', 'Float', { default: 1, configurable: false })
		.add('ignoreChannels', 'TextChannel', { array: true })
		.add('monitorBoost', 'Float', { default: 1, configurable: false }))
	.add('starboard', (folder) => folder
		.add('channel', 'TextChannel')
		.add('emoji', 'String', { default: '%E2%AD%90', configurable: false })
		.add('ignoreChannels', 'TextChannel', { array: true })
		.add('minimum', 'Integer', { default: 1, min: 1, max: 20 }))
	.add('trigger', (folder) => folder
		.add('alias', 'any', { array: true, configurable: false })
		.add('includes', 'any', { array: true, configurable: false }));

declare module 'discord.js' {

	export interface Client {
		version: string;
		leaderboard: Leaderboard;
		ipcMonitors: IPCMonitorStore;
		rawEvents: RawEventStore;
		connectFour: ConnectFourManager;
		usertags: Collection<string, string>;
		llrCollectors: Set<LongLivingReactionCollector>;
		ipc: Node;
		webhookError: Webhook;
		fetchTag(id: string): Promise<string>;
		fetchUsername(id: string): Promise<string>;
	}

}

declare module 'klasa' {

	export interface Language {
		duration(time: number): string;
	}

	export interface Provider {
		db: R;
		pool: MasterPool;
		ping(): Promise<number>;
		sync(table: string): Promise<{ synced: number }>;
		getRandom(table: string): Promise<any>;
	}

	export interface KlasaClientOptions {
		dev?: boolean;
		nms?: {
			role?: number;
			everyone?: number;
		};
	}

	export interface KlasaPieceDefaults {
		ipcMonitors?: PieceOptions;
		rawEvents?: PieceOptions;
	}

}