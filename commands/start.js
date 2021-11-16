const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription('Start a new game'),
	async execute(interaction) {
		console.log(interaction.channel);
    console.log(interaction);
		let thread = await bot.createThread(interaction.channel, 'test2');
		console.log("thread: "  + thread);
		bot.addPlayerToThread(thread, interaction.user.userId);
		return interaction.reply(`Your username: ${interaction.user.username}\nYour ID: ${interaction.user.id}`); // update
	},
};
