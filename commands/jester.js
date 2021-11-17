module.exports = {
	data: new SlashCommandBuilder()
		.setName('jester')
		.setDescription('Choose whose turn it is next.')
		.addStringOption(option => option.setName('displayName').setDescription('Enter displayName')),
	async execute(interaction) {
		return interaction.reply(`Your username: ${interaction.user.username}\nYour ID: ${interaction.user.id}`); // update
	},
};