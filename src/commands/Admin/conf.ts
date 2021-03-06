import { configurableGroups, isSchemaGroup, isSchemaKey, remove, reset, SchemaKey, set } from '#lib/database';
import { LanguageKeys } from '#lib/i18n/languageKeys';
import { SettingsMenu, SkyraCommand } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { PermissionLevels } from '#lib/types/Enums';
import { requiresPermissions } from '#utils/decorators';
import { filter, map } from '#utils/iterator';
import { ApplyOptions } from '@sapphire/decorators';
import { toTitleCase } from '@sapphire/utilities';

@ApplyOptions<SkyraCommand.Options>({
	aliases: ['settings', 'config', 'configs', 'configuration'],
	description: LanguageKeys.Commands.Admin.ConfDescription,
	extendedHelp: LanguageKeys.Commands.Admin.ConfExtended,
	guarded: true,
	permissionLevel: PermissionLevels.Administrator,
	runIn: ['text'],
	subCommands: ['set', { input: 'add', output: 'set' }, 'show', 'remove', 'reset', { input: 'menu', default: true }]
})
export class UserCommand extends SkyraCommand {
	@requiresPermissions(['ADD_REACTIONS', 'EMBED_LINKS', 'MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY'])
	public menu(message: GuildMessage, args: SkyraCommand.Args, context: SkyraCommand.Context) {
		return new SettingsMenu(message, args.t).init(context);
	}

	public async show(message: GuildMessage, args: SkyraCommand.Args) {
		const key = args.finished ? '' : await args.pick('string');
		const schemaValue = configurableGroups.getPathString(key);
		if (schemaValue === null) this.error(LanguageKeys.Commands.Admin.ConfGetNoExt, { key });

		const output = await message.guild.readSettings((settings) => {
			return schemaValue.display(settings, args.t);
		});

		if (isSchemaKey(schemaValue)) {
			return message.send(args.t(LanguageKeys.Commands.Admin.ConfGet, { key, value: output }), {
				allowedMentions: { users: [], roles: [] }
			});
		}

		const title = key ? `: ${key.split('.').map(toTitleCase).join('/')}` : '';
		return message.send(args.t(LanguageKeys.Commands.Admin.Conf, { key: title, list: output }), {
			allowedMentions: { users: [], roles: [] }
		});
	}

	public async set(message: GuildMessage, args: SkyraCommand.Args) {
		const [key, schemaKey] = await this.fetchKey(args);
		const response = await message.guild.writeSettings(async (settings) => {
			await set(settings, schemaKey, args);
			return schemaKey.display(settings, args.t);
		});

		return message.send(args.t(LanguageKeys.Commands.Admin.ConfUpdated, { key, response }), {
			allowedMentions: { users: [], roles: [] }
		});
	}

	public async remove(message: GuildMessage, args: SkyraCommand.Args) {
		const [key, schemaKey] = await this.fetchKey(args);
		const response = await message.guild.writeSettings(async (settings) => {
			await remove(settings, schemaKey, args);
			return schemaKey.display(settings, args.t);
		});

		return message.send(args.t(LanguageKeys.Commands.Admin.ConfUpdated, { key, response }), {
			allowedMentions: { users: [], roles: [] }
		});
	}

	public async reset(message: GuildMessage, args: SkyraCommand.Args) {
		const [key, schemaKey] = await this.fetchKey(args);
		const response = await message.guild.writeSettings(async (settings) => {
			reset(settings, schemaKey);
			schemaKey.display(settings, args.t);
		});

		return message.send(args.t(LanguageKeys.Commands.Admin.ConfReset, { key, value: response }), {
			allowedMentions: { users: [], roles: [] }
		});
	}

	private async fetchKey(args: SkyraCommand.Args) {
		const key = await args.pick('string');
		const value = configurableGroups.getPathString(key);
		if (value === null) this.error(LanguageKeys.Commands.Admin.ConfGetNoExt, { key });
		if (value.dashboardOnly) this.error(LanguageKeys.Commands.Admin.ConfDashboardOnlyKey, { key });
		if (isSchemaGroup(value)) {
			this.error(LanguageKeys.Settings.Gateway.ChooseKey, {
				keys: [
					...map(
						filter(value.childValues(), (value) => !value.dashboardOnly),
						(value) => `\`${value.name}\``
					)
				]
			});
		}

		return [key, value as SchemaKey] as const;
	}
}
