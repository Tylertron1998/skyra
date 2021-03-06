import { ENABLE_AUDIO } from '#root/config';
import { Node, NodeOptions, NodeSend } from '@skyra/audio';
import Redis from 'ioredis';
import { QueueStore } from './QueueStore';

export interface QueueClientOptions extends NodeOptions {
	redis: Redis.Redis | Redis.RedisOptions;
}

export class QueueClient extends Node {
	public readonly queues?: QueueStore;

	public constructor(options: QueueClientOptions, send: NodeSend) {
		super(options, send);
		if (ENABLE_AUDIO) {
			this.queues = new QueueStore(this, options.redis instanceof Redis ? options.redis : new Redis(options.redis));
		}
	}
}
