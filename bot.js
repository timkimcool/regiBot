const { MessageEmbed } = require('discord.js');
module.exports = {
  bot: {
    channel: '909847488725405747',
    setChannel: (id) => {
      channel = id;
    },
    createThread: async function (channel, name) {
      // try {

      // } catch (e) {
      //   console.log(e);
      // }
      return await channel.threads.create({
        name: name,
        autoArchiveDuration: 60,
        reason: 'Needed a separate thread for food',
      });
      // console.log(`Created thread: ${thread.name}`);
      // return thread;
    },
    addPlayerToThread: (thread, userId) => {
      thread.members.add(userId);
      console.log('added player: ' + userId);
    },
    sendEmbedMsg: () => {
      const exampleEmbed = {
        color: 0x0099ff,
        title: 'Some title',
        url: 'https://discord.js.org',
        author: {
          name: 'Some name',
          icon_url: 'https://i.imgur.com/AfFp7pu.png',
          url: 'https://discord.js.org',
        },
        description: 'Some description here',
        thumbnail: {
          url: 'https://i.imgur.com/AfFp7pu.png',
        },
        fields: [
          {
            name: 'Regular field title',
            value: 'Some value here',
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: false,
          },
          {
            name: 'Inline field title',
            value: 'Some value here',
            inline: true,
          },
          {
            name: 'Inline field title',
            value: 'Some value here',
            inline: true,
          },
          {
            name: 'Inline field title',
            value: 'Some value here',
            inline: true,
          },
        ],
        image: {
          url: 'https://i.imgur.com/AfFp7pu.png',
        },
        timestamp: new Date(),
        footer: {
          text: 'Some footer text here',
          icon_url: 'https://i.imgur.com/AfFp7pu.png',
        },
      };
      channel.send({ embeds: [exampleEmbed] });
    }
  }
};