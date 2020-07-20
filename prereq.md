Spectacles (also known as spec) is an array of libraries that allows you to create scalable, distributed Discord bots.

# How exactly does Spec work?
A `gateway` service relays all events into [RabbitMQ](./prereq.md#what-is-rabbitmq), a message brokering service. You then connect to the RabbitMQ instance and subscribe to any events you specified in the gateway.toml configuration file. You can write workers that ingest specified events and handle them accordingly. For example, if you were building a moderation bot, you could have one worker ingest [GUILD_MEMBER_ADD](https://discord.com/developers/docs/topics/gateway#guild-member-add) events for raid detection and another worker to intest [MESSAGE_CREATE](https://discord.com/developers/docs/topics/gateway#message-create) events for spam detection.

# What is RabbitMQ?
> RabbitMQ is a message broker: it accepts and forwards messages. You can think about it as a post office: when you put the mail that you want posting in a post box, you can be sure that Mr. or Ms. Mailperson will eventually deliver the mail to your recipient. In this analogy, RabbitMQ is a post box, a post office and a postman. 

> The major difference between RabbitMQ and the post office is that it doesn't deal with paper, instead it accepts, stores and forwards binary blobs of data ‒ messages. 

For more information, check out the [RabbitMQ tutorials page](https://www.rabbitmq.com/tutorials/tutorial-one-python.html).

# Prerequisites
<!-- TODO: make this better -->
It's highly reccomend you run the spec gateway and RabbitMQ within [Docker](https://docs.docker.com/engine/).  
For sake of simplicity, this guide will be using [Docker Compose](https://docs.docker.com/compose/) to run our application.

# Setting up our Docker environment
## Creating the necessary files
Create a `docker` folder in the root directory and a `gateway` folder within it.  
Within the `gateway` folder, create two files; `Dockerfile` and `gateway.toml`. You'll declare the settings for the gateway within `gateway.toml`.  
Lastly, create a `docker-compose.yml`.  

Your project should look like this:  
```
.
├── docker
│  └── gateway
│     ├── Dockerfile
│     └── gateway.toml
└── docker-compose.yml
```

## Setting up Compose
Within your `docker-compose.yml` file, write:
```yml
version: "3.8"

services:
  # discord gateway
  gateway:
    build: docker/gateway
    restart: unless-stopped

  # message broker for the gateway
  rabbit:
    image: rabbitmq:alpine
    restart: unless-stopped
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=supersecurepasswordnobodywillknow
    ports:
      - 5672:5672
    expose:
      - 5672
```
* `services` is where we declare our services; later down the road you'll add more services here, such as misc. workers or an API that'll also interact with rabbit
	- `gateway` is our instance of the spectacles gateway that you'll setup [later](./prereq.md##Writing-the-gateway-Dockerfile)
	- `rabbit` is our instance of RabbitMQ.

⚠ **Warning**: exposing port `5672` of our RabbitMQ instance is for development purposes only.

## Writing the gateway Dockerfile
Within your Dockerfile, write:
```dockerfile
FROM spectacles/gateway
COPY gateway.toml /
```
This pulls the gateway image from the Docker registry and copies our `gateway.toml` file into the container so the gateway service can read it.  

## Writing the gateway configuration
> Note: the configuration file structure can be found at [spec-tacles/gateway](https://github.com/spec-tacles/gateway#config-file)  

Open your `gateway.toml` file and write:
```toml
token = ""
events = [
	"READY",
	"GUILD_CREATE",
	"MESSAGE_CREATE"
]

intents = [
	"GUILDS",
	"GUILD_MESSAGES"
]

[broker]
type = "amqp"

[amqp]
url = "amqp://admin:supersecurepasswordnobodywillknow@rabbit//"

# the hostname is "rabbit" because that's the name of our service within our Compose file
# the container will resolve "rabbit" to the IP of our RabbitMQ container
```

* `token` is where you'll provide your Discord bot token
* `events` is an array of [events](https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events) that you'd like the gateway process to relay to RabbitMQ
	- ⚠ Note: __only__ the events you define within that array will be relayed into RabbitMQ
* `intents` is an array of strings (that're resolved to a bit) that you'd like to identify to the gateway with. For more information on intents, see [this gist](https://gist.github.com/msciotti/223272a6f976ce4fda22d271c23d72d9)
* `broker.type` is the type of message broker we'll be using -- the only supported type is `amqp`
* `amqp.url` is the url where the gateway can find our RabbitMQ instance

## Testing
Now that your Docker environment is setup, you can ensure its works by running `docker-compose up`.


In the [next section](./simple-bot.md), we'll work on a simple bot that connects to RabbitMQ, ingests MESSAGE_CREATE packets with a ping command.