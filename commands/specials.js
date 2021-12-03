const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('specials')
		.setDescription('Displays suit powers'),
	async execute(interaction) {
		return interaction.reply(`Your username: ${interaction.user.username}\nYour ID: ${interaction.user.id}`); // update
	},
};