module.exports = {
	name: 'ready',  // event name
	once: true, // run only once?
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		// const guild = client.guilds.cache.get(guildId);
		// guild.commands.set([]);
		// console.log(client.application.commands)
		// client.application.commands.set([]);
	},
};