const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.channel.send('**[Pong]**');
		await interaction.reply('loading!');
		await interaction.deleteReply();
	},
};