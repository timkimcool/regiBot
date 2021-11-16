module.exports = {
	name: 'ready',  // event name
	once: true, // run only once?
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};