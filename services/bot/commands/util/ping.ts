import { Command } from '../../structures/commands/Command';
import { APIMessageData } from '@klasa/dapi-types';

export default class extends Command {
	public constructor() {
		super('ping', {
			aliases: ['ping', 'test'],
			parseArgs: false,
			category: 'utilities',
			meta: {
				description: 'Measures the Discord API ReST latency.',
			},
			clientPermissions: new Command.Permissions(Command.Permissions.FLAGS.SEND_MESSAGES),
		});
	}

	public async run(msg: APIMessageData): Promise<void> {
		const m = await this.client.util.sendMessage(msg.channel_id, { content: 'Ping?' });
		const diff = Date.parse(m.timestamp) - Date.parse(msg.timestamp);
		return void this.client.util.editMessage(m.channel_id, m.id, { content: `Pong! \`${diff}ms\`` });
	}
}
