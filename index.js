        require('dotenv').config();
        const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, ActivityType } = require('discord.js');
        const express = require('express');
        const ms = require('ms');

        const app = express();
        const PORT = process.env.PORT || 3000;

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions
            ]
        });

        const activeGiveaways = new Map();
        const endedGiveaways = new Map();

        // Slash commands
        const commands = [
            {
                name: 'start',
                description: 'Start a new giveaway',
                options: [
                    { name: 'channel', type: 7, description: 'Channel to start giveaway in', required: true },
                    { name: 'duration', type: 3, description: 'Duration (e.g., 1d, 2h)', required: true },
                    { name: 'prize', type: 3, description: 'Prize to win', required: true },
                    { name: 'winners', type: 4, description: 'Number of winners', required: true }
                ]
            },
            {
                name: 'end',
                description: 'End a giveaway early',
                options: [
                    { name: 'message_id', type: 3, description: 'Giveaway message ID', required: true }
                ]
            },
            {
                name: 'reroll',
                description: 'Reroll an ended giveaway',
                options: [
                    { name: 'message_id', type: 3, description: 'Ended giveaway message ID', required: true }
                ]
            },
            {
                name: 'stats',
                description: 'Show bot statistics'
            },
            {
                name: 'invite',
                description: 'Get bot invite link'
            },
            {
                name: 'support',
                description: 'Get support server link'
            },
            {
                name: 'help',
                description: 'Show help information'
            }
        ];

        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        (async () => {
            try {
                console.log('Registering slash commands...');
                await rest.put(
                    Routes.applicationCommands(process.env.CLIENT_ID),
                    { body: commands }
                );
                console.log('Slash commands registered successfully!');
            } catch (error) {
                console.error('Error registering commands:', error);
            }
        })();

        client.on('ready', () => {
            console.log(`Logged in as ${client.user.tag}`);
            client.user.setActivity('/help', { type: ActivityType.Playing });
        });

        // Helper function to create giveaway embed
        function createGiveawayEmbed(duration, prize, winners) {
            return new EmbedBuilder()
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(
                    `**Prize:** ${prize}\n` +
                    `**Duration:** ${duration}\n` +
                    `**Winners:** ${winners}\n\n` +
                    'React with 🎉 to enter!'
                )
                .setColor('#FFD700')
                .setFooter({ text: `${client.user.username} Giveaway System` })
                .setTimestamp();
        }

        // Helper function to end giveaway
        async function endGiveaway(messageId, channel) {
            if (!activeGiveaways.has(messageId)) return false;

            const giveaway = activeGiveaways.get(messageId);
            clearTimeout(giveaway.timeout);
            activeGiveaways.delete(messageId);

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) return false;

            const reactions = await message.reactions.cache.get('🎉').users.fetch();
            const participants = reactions.filter(user => !user.bot).map(user => user.id);

            let winners = [];
            for (let i = 0; i < giveaway.winners && participants.length > 0; i++) {
                const winnerIndex = Math.floor(Math.random() * participants.length);
                winners.push(`<@${participants[winnerIndex]}>`);
                participants.splice(winnerIndex, 1);
            }

            const winnerText = winners.length > 0 ? winners.join(', ') : 'No valid participants';

            const endEmbed = new EmbedBuilder()
                .setTitle('🎉 GIVEAWAY ENDED 🎉')
                .setDescription(
                    `**Prize:** ${giveaway.prize}\n` +
                    `**Winners:** ${winnerText}`
                )
                .setColor('#FF0000')
                .setFooter({ text: `${client.user.username} Giveaway System` })
                .setTimestamp();

            const endMessage = await channel.send({ embeds: [endEmbed] });

            endedGiveaways.set(messageId, {
                channelId: channel.id,
                prize: giveaway.prize,
                winners: giveaway.winners,
                endedAt: new Date(),
                endMessageId: endMessage.id
            });

            return true;
        }

        // Helper function to reroll giveaway
        async function rerollGiveaway(messageId) {
            if (!endedGiveaways.has(messageId)) return null;

            const giveaway = endedGiveaways.get(messageId);
            const channel = await client.channels.fetch(giveaway.channelId);
            const originalMessage = await channel.messages.fetch(messageId).catch(() => null);
            if (!originalMessage) return null;

            const reactions = await originalMessage.reactions.cache.get('🎉').users.fetch();
            const participants = reactions.filter(user => !user.bot).map(user => user.id);

            let newWinners = [];
            for (let i = 0; i < giveaway.winners && participants.length > 0; i++) {
                const winnerIndex = Math.floor(Math.random() * participants.length);
                newWinners.push(`<@${participants[winnerIndex]}>`);
                participants.splice(winnerIndex, 1);
            }

            return {
                prize: giveaway.prize,
                winners: newWinners,
                channel,
                endMessageId: giveaway.endMessageId
            };
        }

        // Prefix commands
        client.on('messageCreate', async message => {
            if (message.author.bot || !message.content.startsWith(process.env.PREFIX)) return;

            const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === 'start') {
                if (!message.member.permissions.has('ManageMessages')) {
                    return message.reply('You need the Manage Messages permission to start giveaways.');
                }

                const channel = message.mentions.channels.first();
                if (!channel) return message.reply('Please mention a valid channel.');

                const duration = args[1];
                if (!duration) return message.reply('Please specify a duration (e.g., 1d, 2h).');

                const prize = args.slice(2, args.length - 1).join(' ');
                if (!prize) return message.reply('Please specify a prize.');

                const winners = parseInt(args[args.length - 1]);
                if (isNaN(winners) || winners < 1) return message.reply('Please specify a valid number of winners.');

                const embed = createGiveawayEmbed(duration, prize, winners);
                const giveawayMessage = await channel.send({ embeds: [embed] });
                await giveawayMessage.react('🎉');

                const timeout = setTimeout(async () => {
                    await endGiveaway(giveawayMessage.id, channel);
                }, ms(duration));

                activeGiveaways.set(giveawayMessage.id, {
                    channelId: channel.id,
                    prize,
                    winners,
                    timeout
                });

                await message.reply(`Giveaway started in ${channel}! ${client.user.username} will handle the rest!`);
            }

            if (command === 'end') {
                if (!message.member.permissions.has('ManageMessages')) {
                    return message.reply('You need the Manage Messages permission to end giveaways.');
                }

                const messageId = args[0];
                if (!messageId) return message.reply('Please provide a giveaway message ID.');

                const success = await endGiveaway(messageId, message.channel);
                if (!success) return message.reply('Could not find an active giveaway with that ID.');

                await message.reply(`${client.user.username} ended the giveaway successfully!`);
            }

            if (command === 'reroll') {
                if (!message.member.permissions.has('ManageMessages')) {
                    return message.reply('You need the Manage Messages permission to reroll giveaways.');
                }

                const messageId = args[0];
                if (!messageId) return message.reply('Please provide an ended giveaway message ID.');

                const result = await rerollGiveaway(messageId);
                if (!result) return message.reply('Could not find an ended giveaway with that ID.');

                const winnerText = result.winners.length > 0 ? result.winners.join(', ') : 'No valid participants';

                const rerollEmbed = new EmbedBuilder()
                    .setTitle('🎉 GIVEAWAY REROLLED 🎉')
                    .setDescription(
                        `**Prize:** ${result.prize}\n` +
                        `**New Winners:** ${winnerText}`
                    )
                    .setColor('#00FF00')
                    .setFooter({ text: `${client.user.username} Giveaway System` })
                    .setTimestamp();

                const endMessage = await result.channel.messages.fetch(result.endMessageId).catch(() => null);
                if (endMessage) {
                    await endMessage.edit({ embeds: [rerollEmbed] });
                } else {
                    await result.channel.send({ embeds: [rerollEmbed] });
                }

                await message.reply(`${client.user.username} rerolled the giveaway successfully!`);
            }

            if (command === 'stats') {
                const embed = new EmbedBuilder()
                    .setTitle(`${client.user.username} Statistics`)
                    .addFields(
                        { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true },
                        { name: 'Users', value: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toString(), inline: true },
                        { name: 'Active Giveaways', value: activeGiveaways.size.toString(), inline: true },
                        { name: 'Ended Giveaways', value: endedGiveaways.size.toString(), inline: true }
                    )
                    .setColor('#7289DA')
                    .setFooter({ text: `${client.user.username} Giveaway System` })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            }

            if (command === 'invite') {
                const inviteLink = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=277025770560&scope=bot%20applications.commands`;
                await message.reply(`Invite ${client.user.username} to your server: ${inviteLink}`);
            }

            if (command === 'support') {
                await message.reply(`Join our support server: https://discord.com/invite/9MVAPpfs8D\n\nNeed help with ${client.user.username}? We're here to help!`);
            }

            if (command === 'help') {
                const embed = new EmbedBuilder()
                    .setTitle(`${client.user.username} Commands Help`)
                    .setDescription(`Here are all the available commands for ${client.user.username}:`)
                    .addFields(
                        { name: `${process.env.PREFIX}start #channel duration prize winners`, value: 'Start a new giveaway' },
                        { name: `${process.env.PREFIX}end message_id`, value: 'End a giveaway early' },
                        { name: `${process.env.PREFIX}reroll message_id`, value: 'Reroll an ended giveaway' },
                        { name: `${process.env.PREFIX}stats`, value: 'Show bot statistics' },
                        { name: `${process.env.PREFIX}invite`, value: 'Get bot invite link' },
                        { name: `${process.env.PREFIX}support`, value: 'Get support server link' },
                        { name: `${process.env.PREFIX}help`, value: 'Show this help message' }
                    )
                    .setColor('#7289DA')
                    .setFooter({ text: `${client.user.username} Giveaway System` })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            }
        });

        // Slash commands
        client.on('interactionCreate', async interaction => {
            if (!interaction.isCommand()) return;

            const { commandName, options } = interaction;

            if (commandName === 'start') {
                if (!interaction.memberPermissions.has('ManageMessages')) {
                    return interaction.reply({ content: 'You need the Manage Messages permission to start giveaways.', ephemeral: true });
                }

                const channel = options.getChannel('channel');
                const duration = options.getString('duration');
                const prize = options.getString('prize');
                const winners = options.getInteger('winners');

                const embed = createGiveawayEmbed(duration, prize, winners);
                const giveawayMessage = await channel.send({ embeds: [embed] });
                await giveawayMessage.react('🎉');

                const timeout = setTimeout(async () => {
                    await endGiveaway(giveawayMessage.id, channel);
                }, ms(duration));

                activeGiveaways.set(giveawayMessage.id, {
                    channelId: channel.id,
                    prize,
                    winners,
                    timeout
                });

                await interaction.reply({ content: `Giveaway started in ${channel}! ${client.user.username} will handle the rest!`, ephemeral: true });
            }

            if (commandName === 'end') {
                if (!interaction.memberPermissions.has('ManageMessages')) {
                    return interaction.reply({ content: 'You need the Manage Messages permission to end giveaways.', ephemeral: true });
                }

                const messageId = options.getString('message_id');
                const success = await endGiveaway(messageId, interaction.channel);

                if (!success) {
                    return interaction.reply({ content: 'Could not find an active giveaway with that ID.', ephemeral: true });
                }

                await interaction.reply({ content: `${client.user.username} ended the giveaway successfully!`, ephemeral: true });
            }

            if (commandName === 'reroll') {
                if (!interaction.memberPermissions.has('ManageMessages')) {
                    return interaction.reply({ content: 'You need the Manage Messages permission to reroll giveaways.', ephemeral: true });
                }

                const messageId = options.getString('message_id');
                const result = await rerollGiveaway(messageId);

                if (!result) {
                    return interaction.reply({ content: 'Could not find an ended giveaway with that ID.', ephemeral: true });
                }

                const winnerText = result.winners.length > 0 ? result.winners.join(', ') : 'No valid participants';

                const rerollEmbed = new EmbedBuilder()
                    .setTitle('🎉 GIVEAWAY REROLLED 🎉')
                    .setDescription(
                        `**Prize:** ${result.prize}\n` +
                        `**New Winners:** ${winnerText}`
                    )
                    .setColor('#00FF00')
                    .setFooter({ text: `${client.user.username} Giveaway System` })
                    .setTimestamp();

                const endMessage = await result.channel.messages.fetch(result.endMessageId).catch(() => null);
                if (endMessage) {
                    await endMessage.edit({ embeds: [rerollEmbed] });
                } else {
                    await result.channel.send({ embeds: [rerollEmbed] });
                }

                await interaction.reply({ content: `${client.user.username} rerolled the giveaway successfully!`, ephemeral: true });
            }

            if (commandName === 'stats') {
                const embed = new EmbedBuilder()
                    .setTitle(`${client.user.username} Statistics`)
                    .addFields(
                        { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true },
                        { name: 'Users', value: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toString(), inline: true },
                        { name: 'Active Giveaways', value: activeGiveaways.size.toString(), inline: true },
                        { name: 'Ended Giveaways', value: endedGiveaways.size.toString(), inline: true }
                    )
                    .setColor('#7289DA')
                    .setFooter({ text: `${client.user.username} Giveaway System` })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            if (commandName === 'invite') {
                const inviteLink = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=277025770560&scope=bot%20applications.commands`;
                await interaction.reply({ content: `Invite ${client.user.username} to your server: ${inviteLink}`, ephemeral: true });
            }

            if (commandName === 'support') {
                await interaction.reply({ 
                    content: `${client.user.username} support server: https://discord.com/invite/9MVAPpfs8D\n\nGet help with giveaways and more!`, 
                    ephemeral: true 
                });
            }

            if (commandName === 'help') {
                const embed = new EmbedBuilder()
                    .setTitle(`${client.user.username} Commands`)
                    .setDescription(`Here are all the available commands for ${client.user.username}:`)
                    .addFields(
                        { name: '/start channel duration prize winners', value: 'Start a new giveaway' },
                        { name: '/end message_id', value: 'End a giveaway early' },
                        { name: '/reroll message_id', value: 'Reroll an ended giveaway' },
                        { name: '/stats', value: 'Show bot statistics' },
                        { name: '/invite', value: 'Get bot invite link' },
                        { name: '/support', value: 'Get support server link' },
                        { name: '/help', value: 'Show this help message' }
                    )
                    .setColor('#7289DA')
                    .setFooter({ text: `${client.user.username} Giveaway System` })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        });

        app.get('/', (req, res) => {
            res.send(`${client.user?.username || 'Giveaway Bot'} is running!`);
        });

        client.login(process.env.TOKEN)
            .then(() => {
                app.listen(PORT, () => {
                    console.log(`Server running on port ${PORT}`);
                    console.log(`${client.user.username} is ready!`);
                });
            })
            .catch(err => {
                console.error('Failed to login:', err);
                process.exit(1);
            });
