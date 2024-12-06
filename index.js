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

client.on("ready", () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Basic command
  if (message.content === "!ping") {
    message.channel.send("Nakara Muji");
  }
});

client.login(process.env.TOKEN);
