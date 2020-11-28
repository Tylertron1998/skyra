import { TicTacToeBotController } from '#lib/games/tic-tac-toe/TicTacToeBotController';
import { TicTacToeGame } from '#lib/games/tic-tac-toe/TicTacToeGame';
import { TicTacToeHumanController } from '#lib/games/tic-tac-toe/TicTacToeHumanController';
import { SkyraCommand } from '#lib/structures/SkyraCommand';
import { GuildMessage } from '#lib/types';
import { LanguageKeys } from '#lib/types/namespaces/LanguageKeys';
import { CLIENT_ID } from '#root/config';
import { User } from 'discord.js';
import { CommandStore, Usage } from 'klasa';

export default class extends SkyraCommand {
	private readonly channels: Set<string> = new Set();
	private prompt: Usage;

	public constructor(store: CommandStore, file: string[], directory: string) {
		super(store, file, directory, {
			aliases: ['ttt'],
			cooldown: 10,
			description: (language) => language.get(LanguageKeys.Commands.Games.TicTacToeDescription),
			extendedHelp: (language) => language.get(LanguageKeys.Commands.Games.TicTacToeExtended),
			requiredPermissions: ['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'],
			runIn: ['text'],
			usage: '<user:username>'
		});

		this.prompt = this.definePrompt('<response:boolean>');
	}

	public async run(message: GuildMessage, [user]: [User]) {
		if (this.channels.has(message.channel.id)) throw await message.fetchLocale(LanguageKeys.Commands.Games.GamesProgress);
		const player1 = this.getAuthorController(message);
		const player2 = await this.getTargetController(message, user);

		this.channels.add(message.channel.id);
		const game = new TicTacToeGame(message, player1, player2);

		try {
			await game.run();
		} finally {
			this.channels.delete(message.channel.id);
		}
	}

	private getAuthorController(message: GuildMessage) {
		return new TicTacToeHumanController(message.author.username, message.author.id);
	}

	private async getTargetController(message: GuildMessage, user: User) {
		if (user.id === CLIENT_ID) return new TicTacToeBotController();

		const language = await message.fetchLanguage();
		if (user.bot) throw language.get(LanguageKeys.Commands.Games.GamesBot);
		if (user.id === message.author.id) throw language.get(LanguageKeys.Commands.Games.GamesSelf);

		const [response] = await this.prompt.createPrompt(message, { target: user }).run(
			language.get(LanguageKeys.Commands.Games.TicTacToePrompt, {
				challenger: message.author.toString(),
				challengee: user.toString()
			})
		);

		if (response) return new TicTacToeHumanController(user.username, user.id);
		throw language.get(LanguageKeys.Commands.Games.GamesPromptDeny);
	}
}
