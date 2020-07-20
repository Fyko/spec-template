require('dotenv').config();

const { Amqp } = require('@spectacles/brokers');
const { Rest } = require('@spectacles/rest');

const rest = new Rest(process.env.DISCORD_TOKEN);
const broker = new Amqp(process.env.AMQP_GROUP);

broker.on('error', console.error);

async function sendMessage(channelId, data) {
	const res = await rest.post(`/channels/${channelId}/messages`, data);
	return res;
}

async function editMessage(channelId, messageId, data) {
	const res = await rest.patch(`/channels/${channelId}/messages/${messageId}`, data);
	return res;
}

async function handleMessage(msg) {
	if (msg.author.bot) // ignore if the message comes from a bot
	if (!msg.content.startsWith(process.env.PREFIX)) return; // return if the message doesn't start with the command prefix

	const args = msg.content.slice(process.env.PREFIX.length).split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'ping') {
		const m = await sendMessage(msg.channel_id, { content: 'Ping?' });
		const diff = Date.parse(m.timestamp) - Date.parse(msg.timestamp);
		return editMessage(m.channel_id, m.id, { content: `Pong! \`${diff}ms\`` });
	}
}

async function bootstrap() {	
	// crate an event listener for the READY event
	broker.on('READY', ({ user }, { ack }) => {
		ack();

		console.log(`${user.username}${user.discriminator} (${user.id}) has emitted READY.`);
	});

	// create an event listener for the MESSAGE_CREATE event
	broker.on('MESSAGE_CREATE', (data, { ack }) => {
		ack();

		return handleMessage(data);
	});

	const { connection } = await broker.connect(process.env.AMQP_URL);
	console.debug(`Connected to ${connection.serverProperties.cluster_name}.`);

	const events = ['READY', 'MESSAGE_CREATE'];
	await broker.subscribe(events);
	console.log(`Subscribed to events ${events.join(', ')}.`);
}

bootstrap();