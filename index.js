import {
  Client,
  ClientPresence,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

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
  const commands = [
    new SlashCommandBuilder()
      .setName("setAssignment")
      .setDescription("Write in this format: ")
      .addStringOption((option) => option.setName("message").setRequired(true))
      .toJSON(),
  ];
  try {
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

client.login(process.env.TOKEN);
