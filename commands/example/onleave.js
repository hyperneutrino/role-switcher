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
                .setLabel("Go On Leave")
                .setCustomId("onleave/onleave")
                .setStyle(2)),
            new ActionRowBuilder().addComponents(new ButtonBuilder()
                .setLabel("Return From Leave")
                .setCustomId("onleave/back")
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

        let goingOnLeave = interaction.customId === "onleave/onleave";

        let newRoles = value.reduce((cache, [role1ID, role2ID]) => {
            let role1 = guild.roles.cache.get(role1ID)
            let role2 = guild.roles.cache.get(role2ID)

            if (guildMember.roles.cache.has(role1ID) && goingOnLeave) {
                if (guild.id == interaction.guild.id) switched[winDex].value.push(`Switched <@&${role1ID}> -> <@&${role2ID}>`)
                else switched[winDex].value.push(`Switched ${role1.name} -> ${role2.name}`)
                cache.delete(role1ID)
                cache.add(role2ID)
            } else if (guildMember.roles.cache.has(role2ID) && !goingOnLeave) {
                if (guild.id == interaction.guild.id) switched[winDex].value.push(`Switched <@&${role2ID}> -> <@&${role1ID}>`)
                else switched[winDex].value.push(`Switched ${role2.name} -> ${role1.name}`)
                cache.delete(role2ID)
                cache.add(role1ID)
            }
            return cache
        }, new Set(guildMember.roles.cache.keys()));

        await guildMember.roles.set(Array.from(newRoles));

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
        .setCustomId(interaction.customId)
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
