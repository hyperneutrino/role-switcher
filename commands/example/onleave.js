const {
    EmbedBuilder,
    ButtonBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js')

exports.slash = async (client, interaction) => {

    let switchArray = Object.entries(client.config.switch)

    // remove any servers that are not interaction.guild.id
    switchArray = switchArray.filter(value => value[0].split("|")[0] == interaction.guild.id)

    switchArray = switchArray.map((value) => {
        return {
            name: `Applies to Both Servers`,
            value: `Roles:\n${value[1].map((value) => `<@&${value[0]}> <-> <@&${value[1]}>`).join("\n")}`
        }
    })

    interaction.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('Switch On Leave Status')
            .setDescription('Click the button below to go on leave, or to come back from leave.\n\n**Note:** Feel free to leave the reason/time blank if you\'re coming back from leave.')
            .addFields(switchArray)
        ],
        components: [
            new ActionRowBuilder().addComponents(new ButtonBuilder()
                .setLabel("Switch On Leave Status")
                .setCustomId("onleave")
                .setStyle(2))
        ]

    })
}
exports.modal = async (client, interaction) => {

    // get their reason and duration

    let reason = interaction.components[0].components[0].value || "No reason provided.";
    let duration = interaction.components[1].components[0].value || "No duration provided.";

    let switched = []

    for await (const [key, value] of Object.entries(client.config.switch)) {

        let winDex = Object.entries(client.config.switch).findIndex(value => value[0] == key)
        if (!switched[winDex]) switched[winDex] = {
            name: `Server = ${key.split("|")[1]}`,
            value: ["Roles:"]
        }

        // for the server with the id of key
        let guild = await client.guilds.cache.get(key.split("|")[0])
        let guildMember = await guild.members.fetch(interaction.user.id)

        value.forEach(async (value, index, array) => {

            let role1 = await guild.roles.cache.get(value[0])
            let role2 = await guild.roles.cache.get(value[1])

            if (guildMember.roles.cache.has(value[0])) {
                if (guild.id == interaction.guild.id) switched[winDex].value.push(`Switched <@&${value[0]}> -> <@&${value[1]}>`)
                else switched[winDex].value.push(`Switched ${role1.name} -> ${role2.name}`)
                await guildMember.roles.remove(value[0])
                await guildMember.roles.add(value[1])
            } else if (guildMember.roles.cache.has(value[1])) {
                if (guild.id == interaction.guild.id) switched[winDex].value.push(`Switched <@&${value[1]}> -> <@&${value[0]}>`)
                else switched[winDex].value.push(`Switched ${role2.name} -> ${role1.name}`)
                await guildMember.roles.remove(value[1])
                await guildMember.roles.add(value[0])
            }
        })

    }

    switched = switched.map((server) =>
        server = {
            name: server.name,
            value: server.value.join("\n")
        }
    )

    interaction.reply({
        embeds: [
            new EmbedBuilder()
            .setTitle('Successfully switched on-leave status.')
            .setDescription(`Provided Reason: ${reason}\nProvided Duration: ${duration}`)
            .addFields(switched)
            .setTimestamp()
        ],
        ephemeral: true
    })

    let logChannel = await client.channels.cache.get(client.config.logChannel)
    logChannel.send({
        embeds: [
            new EmbedBuilder()
            .setTitle('On-Leave Status Switched')
            .setDescription(`**User:** ${interaction.user.tag} (${interaction.user.id})\n**Reason:** ${reason}\n**Duration:** ${duration}`)
            .addFields(switched)
            .setTimestamp()
        ]
    })
}
exports.button = async (client, interaction) => {
    await interaction.showModal(new ModalBuilder()
        .setCustomId(`onleave`)
        .setTitle(`The following information is optional.`)
        .addComponents([
            new ActionRowBuilder().addComponents([
                new TextInputBuilder()
                .setLabel('Reason')
                .setCustomId("reason")
                .setRequired(false)
                .setMaxLength(2048)
                .setStyle(2)
                .setPlaceholder('Optional.'),
            ]),
            new ActionRowBuilder().addComponents([
                new TextInputBuilder()
                .setLabel('Duration Of Leave')
                .setCustomId("duration")
                .setRequired(false)
                .setMaxLength(2048)
                .setStyle(2)
                .setPlaceholder('Optional.'),
            ])
        ], ));
}

exports.setup = async (client, guilds) => {
    guilds.map(guild => guild.commands.create({
        name: "onleave",
        description: "Send the onleave embed",
    }));
}