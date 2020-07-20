In this section, we'll be creating a simple Discord bot that connects to our RabbitMQ instances from the [first section](./prereq.md)

# Setup
## Dependencies
Create a new Node.js project with `npm init -y` and install the dependencies:

* [spectacles/brokers](https://github.com/spec-tacles/brokers.js) - used to connect to RabbitMQ 
* [spectacles/rest](https://github.com/spec-tacles/rest.js) - used to interact with the Discord ReST API
* [spectacles/util](https://github.com/spec-tacles/util.js) - standard utilities such as Permissions
* [dotenv](https://npmjs.org/dotenv) - to load our .env file  

`npm i dotenv @spectacles/brokers @spectacles/rest @spectacles/util`

## Create a .env file
Create a `.env` file and write:
```
DISCORD_TOKEN=
PREFIX=spec!
AMQP_URL=admin:supersecurepasswordnobodywillknow@rabbit//
AMQP_GROUP=gateway

```
* `DISCORD_TOKEN` is our Discord bot token
* `PREFIX` is our command prefix, all commands ran must be prefixed with this string; eg: `spec!ping`
* `AMQP_URL` is the same amqp url from [Writing the gateway configuration](./prereq.md#Writing-the-gateway-configuration) __with the protocol omitted__
* `AMQP_GROUP` is the AMQP group that our gateway instance is relaying the Discord events into -- this shouldn't be changed 

## Create the base file
Create an `index.js` file.

Your project should now look like this:
```
.
├── docker
│  └── gateway
│     ├── Dockerfile
│     └── gateway.toml
├── node_modules
├── .env
├── docker-compose.yml
├── index.js
├── package-lock.json
├── package.json
```

# Writing the Bot
## Declaring globals

We start by importing and running the `config` function from `dotenv` to read our `.env` file.  
Next, we import our Amqp & ReST classes and initilize them passing our Discord bot token and Amqp group respectively.  
The final line with the broker `error` listener will print any errors the broker encounters.  
```js
require('dotenv').config();

const { Amqp } = require('@spectacles/brokers');
const { Rest } = require('@spectacles/rest');

const rest = new Rest(process.env.DISCORD_TOKEN);
const broker = new Amqp(process.env.AMQP_GROUP);

broker.on('error', console.error);
```  

We then define two helper functions to use for sending and editing messages. Both the `POST` and `PATCH` requests will be performed within our REST client itself.
```js
async function sendMessage(channelId, data) {
	const res = await rest.post(`/channels/${channelId}/messages`, data);
	return res;
}

async function editMessage(channelId, messageId, data) {
	const res = await rest.patch(`/channels/${channelId}/messages/${messageId}`, data);
	return res;
}
```  
  
Next, we define a `handleMessage` function that we'll pass our data from the `MESSAGE_CREATE` event into.  
Here, we ensure the message isn't from another bot and verify the incoming message begins with our command prefix.
We check if the provided command is `ping` -- and if it is -- continue with determining and ultimately returning the ReST latency.
```js
async function handleMessage(msg) {
	if (msg.author.bot) // ignore if the message comes from a bot
	if (!msg.content.startsWith(process.env.PREFIX)) return; // ignore if doesn't start with prefix

	const args = msg.content.slice(process.env.PREFIX.length).split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'ping') {
		const m = await sendMessage(msg.channel_id, { content: 'Ping?' });
		const diff = Date.parse(m.timestamp) - Date.parse(msg.timestamp);
		return editMessage(m.channel_id, m.id, { content: `Pong! \`${diff}ms\`` });
	}
}
```

Finally, the `bootstrap` function creates all listeners on the broker instance, connects to RabbitMQ and subscribes to the events we're using.
```js
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
```
