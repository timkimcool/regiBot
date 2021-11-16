const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('discard')
		.setDescription('Discard space delimitted list of cards')
		.addStringOption(option => option.setName('cards').setDescription('Enter a string')),
	async execute(interaction) {
		return interaction.reply(`Your username: ${interaction.user.username}\nYour ID: ${interaction.user.id}`); // update
	},
};