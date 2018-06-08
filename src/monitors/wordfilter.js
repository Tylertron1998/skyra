const { Monitor, MessageEmbed } = require('../index');

module.exports = class extends Monitor {

	constructor(...args) {
		super(...args, {
			ignoreBots: false,
			ignoreOthers: false,
			ignoreSelf: true,
			ignoreWebhooks: true
		});
	}

	async run(msg) {
		const { configs } = msg.guild;
		if (await msg.hasAtLeastPermissionLevel(5)
			|| !configs.filter.regexp
			|| !configs.filter.regexp.test(msg.content)) return false;

		if (msg.deletable) await msg.nuke().catch(() => null);
		if (configs.filter.level === 1 || configs.filter.level === 3)
			msg.sendMessage(msg.language.get('MONITOR_WORDFILTER', msg.author)).catch(() => null);

		if (configs.filter.level !== 2 && configs.filter.level !== 3) return true;

		const modLogChannelID = configs.channels.modlog;
		if (!modLogChannelID) return true;

		const channel = msg.guild.channels.get(modLogChannelID);
		if (!channel) return configs.reset('channel.modlog');

		return channel.send(new MessageEmbed()
			.setColor(0xefae45)
			.setAuthor(`${msg.author.tag} (${msg.author.id})`, msg.author.displayAvatarURL({ size: 128 }))
			.setFooter(`#${msg.channel.name} | ${msg.language.get('CONST_MONITOR_WORDFILTER')} ${configs.filter.regexp.exec(msg.content)[0]}`)
			.setTimestamp());
	}

	shouldRun(msg) {
		if (!this.enabled || !msg.guild || msg.author.id === this.client.user.id) return false;

		const { selfmod, filter } = msg.guild.configs;
		return filter.level !== 0 && filter.regexp !== null && !selfmod.ignoreChannels.includes(msg.channel.id);
	}


};