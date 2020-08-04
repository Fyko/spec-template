import { Amqp } from '@spectacles/brokers';
import { Message, Ready } from '@spectacles/types';
import Proxy, { StringRecord, Request } from './proxy';

// importing all our env vars for later use
const { REST_GROUP, GATEWAY_GROUP, REST_EVENT, AMQP_URL, DISCORD_TOKEN, PREFIX } = process.env as StringRecord;

// initialize our proxy class
const proxy = new Proxy({ group: REST_GROUP, event: REST_EVENT, url: AMQP_URL });
// initialize a broker to the gateway
const gateway = new Amqp(GATEWAY_GROUP);

// the default headers for our requests
const DEFAULT_HEADERS = {
	Authorization: `Bot ${DISCORD_TOKEN}`,
	'Content-Type': 'application/json',
}

// data for creating a new message
interface MessageData {
	content: string;
}

// creating a new message
async function sendMessage(channelId: string, data: MessageData | string): Promise<Message> {
	// the options for the request
	const request: Request = {
		method: 'POST',
		path: `/channels/${channelId}/messages`,
		headers: DEFAULT_HEADERS,
	};

	// so the second param can be a string identified as
	// the message content
	if (typeof data === 'string') request.body = { content: data };
	// @ts-ignore
	else request.body = data;

	// finally perform our request
	return proxy.request<Message>(request);
}

// edit a message, basically everything from above
// is same semantically
async function editMessage(channelId: string, messageId: string, data: MessageData | string): Promise<Message> {
	const request: Request = {
		method: 'PATCH',
		path: `/channels/${channelId}/messages/${messageId}`,
		headers: DEFAULT_HEADERS,
	};

	if (typeof data === 'string') request.body = { content: data };
	// @ts-ignore
	else request.body = data;

	return proxy.request<Message>(request);
}

// handle a message from the gateway
async function handleMessage(msg: Message): Promise<Message | void> {
	if (msg.author.bot) return; // if the message is from a bot, ignore!
	if (!msg.content.startsWith(PREFIX)) return; // return if the message doesn't start with the command prefix

	const args = msg.content.slice(PREFIX.length).split(/ +/);
	const command = args.shift()?.toLowerCase();

	if (command === 'ping') {
		const m = await sendMessage(msg.channel_id, { content: 'Ping?' });
		const diff = Date.parse(m.timestamp) - Date.parse(msg.timestamp);
		return editMessage(m.channel_id, m.id, { content: `Pong! \`${diff}ms\`` });
	}
}

// bootstrap our bot
async function bootstrap() {
	// creating the proxies connection to rabbit
	await proxy.connect();
	console.debug(`[PROXY] Connected to ${proxy._connection?.connection.serverProperties.cluster_name}.`);

	// listen on the ready event
	gateway.on('READY', ({ user }: Ready, { ack }) => {
		ack();

		console.log(`${user.username}${user.discriminator} (${user.id}) has emitted READY.`);
	});

	// listen on the message event and handle new messages
	gateway.on('MESSAGE_CREATE', (data: Message, { ack }) => {
		ack();

		return handleMessage(data);
	});

	// connect to rabbit
	const { connection } = await gateway.connect(process.env.AMQP_URL);
	console.debug(`[GATEWAY] Connected to ${connection.serverProperties.cluster_name}.`);

	const events = ['READY', 'MESSAGE_CREATE'];
	// subscribe to only the events we need
	await gateway.subscribe(events);
	console.log(`Subscribed to events ${events.join(', ')}.`);
}

bootstrap();