import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  //Creating Commands
  const commands = [
    //Command for setting assignment
    new SlashCommandBuilder()
      .setName("setassignment") // Command name
      .setDescription("Set an assignment with a name, deadline, and details.") // Command description
      .addStringOption(
        (option) =>
          option
            .setName("subject") // Option name
            .setDescription("The name of the assignment") // Option description
            .setRequired(true) // Makes it mandatory
      )
      .addStringOption(
        (option) =>
          option
            .setName("deadline") // Option name
            .setDescription("Deadline for the assignment (e.g., YYYY-MM-DD)") // Option description
            .setRequired(true) // Makes it mandatory
      )
      .addStringOption(
        (option) =>
          option
            .setName("details") // Option name
            .setDescription("Additional details about the assignment") // Option description
            .setRequired(false) // Optional field
      )
      .toJSON(),
  ];
  try {
    //Registering commands in the GUILD
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log("Successfully registered commands.");
  } catch (error) {
    console.error(error);
  }
});

client.on("messageCreate", (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Basic command
  if (message.content === "!ping") {
    message.channel.send("");
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === "setassignment") {
    const subject = interaction.options.getString("subject");
    const deadline = interaction.options.getString("deadline");
    const details = interaction.options.getString("details");

    const work = { subject, deadline, details };

    await interaction.reply(
      `**Testing Work Object**\n` +
        `\`\`\`json\n${JSON.stringify(work, null, 2)}\n\`\`\``
    );
  }
});

//Login for Bot
client.login(process.env.TOKEN);
