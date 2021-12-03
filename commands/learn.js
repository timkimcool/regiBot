const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('learn')
		.setDescription('Learn how to play'),
	async execute(interaction) {
		return interaction.reply(`Your username: ${interaction.user.username}\nYour ID: ${interaction.user.id}`); // update
	},
};