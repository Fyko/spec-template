import { Amqp } from '@spectacles/brokers';
import { User, Message, Ready } from '@spectacles/types';
import Proxy, { StringRecord, Request } from './proxy';

const { REST_GROUP, GATEWAY_GROUP, REST_EVENT, AMQP_URL, DISCORD_TOKEN, PREFIX } = process.env as StringRecord;

const proxy = new Proxy({ group: REST_GROUP, event: REST_EVENT, url: AMQP_URL });
const gateway = new Amqp(GATEWAY_GROUP);

const DEFAULT_HEADERS = {
	Authorization: `Bot ${DISCORD_TOKEN}`,
	'Content-Type': 'application/json',
}

interface MessageData {
	content: string;
}

async function sendMessage(channelId: string, data: MessageData | string): Promise<Message> {
	const request: Request = {
		method: 'POST',
		path: `/channels/${channelId}/messages`,
		headers: DEFAULT_HEADERS,
	};

	if (typeof data === 'string') request.body = { content: data };
	// @ts-ignore
	else request.body = data;

	const res = await proxy.request<Message>(request);

	if (typeof res.body === 'string') throw Error(res.body);
	return res.body.body as Message;
}

async function editMessage(channelId: string, messageId: string, data: MessageData | string): Promise<Message> {
	const request: Request = {
		method: 'PATCH',
		path: `/channels/${channelId}/messages/${messageId}`,
		headers: DEFAULT_HEADERS,
	};

	if (typeof data === 'string') request.body = { content: data };
	// @ts-ignore
	else request.body = data;

	const res = await proxy.request<Message>(request);

	if (typeof res.body === 'string') throw Error(res.body);
	return res.body.body as Message;
}

async function handleMessage(msg: Message): Promise<Message | void> {
	if (msg.author.bot)
	if (!msg.content.startsWith(PREFIX)) return; // return if the message doesn't start with the command prefix

	const args = msg.content.slice(PREFIX.length).split(/ +/);
	const command = args.shift()?.toLowerCase();

	if (command === 'ping') {
		const m = await sendMessage(msg.channel_id, { content: 'Ping?' });
		const diff = Date.parse(m.timestamp) - Date.parse(msg.timestamp);
		return editMessage(m.channel_id, m.id, { content: `Pong! \`${diff}ms\`` });
	}
}


async function bootstrap() {
	await proxy.connect();
	console.debug(`[PROXY] Connected to ${proxy._connection?.connection.serverProperties.cluster_name}.`);

	gateway.on('READY', ({ user }: Ready, { ack }) => {
		ack();

		console.log(`${user.username}${user.discriminator} (${user.id}) has emitted READY.`);
	});

	gateway.on('MESSAGE_CREATE', (data: Message, { ack }) => {
		ack();

		return handleMessage(data);
	});

	const { connection } = await gateway.connect(process.env.AMQP_URL);
	console.debug(`[GATEWAY] Connected to ${connection.serverProperties.cluster_name}.`);

	const events = ['READY', 'MESSAGE_CREATE'];
	await gateway.subscribe(events);
	console.log(`Subscribed to events ${events.join(', ')}.`);
}

bootstrap();