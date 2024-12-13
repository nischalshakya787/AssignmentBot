import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Assignment from "./model/Assignment.js";
import moment from "moment";
import cron from "node-cron";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// Calculate Time Remaining
const timeRemaining = (deadline) => {
  const currentTime = new Date();
  const deadlineTime = new Date(deadline);
  const timeRemaining = deadlineTime - currentTime;

  // Convert time remaining to days, hours, and minutes
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutesRemaining = Math.floor(
    (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
  );
  // Format the time remaining
  return `${daysRemaining} day(s), ${hoursRemaining} hour(s), ${minutesRemaining} minute(s)`;
};

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
            .setRequired(true) // Optional field
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("assignment")
      .setDescription("Get details of an assignment.")
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

    //Connection to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DB");

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

//Interaction for Commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "setassignment") {
    //Getting the input data
    const subject = interaction.options.getString("subject");
    const deadline = interaction.options.getString("deadline");
    const details = interaction.options.getString("details");

    // Validate deadline
    if (!moment(deadline, "YYYY-MM-DD", true).isValid()) {
      return interaction.reply("Invalid deadline format. Use YYYY-MM-DD.");
    }

    const deadlineDate = moment(deadline + " 20:10", "YYYY-MM-DD HH:mm"); // Set time to 4 PM

    //Validation if user sets time at past
    // if (deadlineDate.isBefore(moment())) {
    //   return interaction.reply("The deadline cannot be in the past.");
    // }

    const timeRemainingString = timeRemaining(deadline);

    //Channel to send the notify other(like assignment channel);
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);

    try {
      //Stores the message in mongoDB
      //Response to send all
      channel.send({
        content:
          ` @everyone\n **Assignment Details**\n` +
          `**Subject**: ${subject}\n` +
          `**Deadline**: ${deadline}\n` +
          `**Time Remaining**: ${timeRemainingString}\n` +
          `**Details**: ${details || "No additional details provided."}`,
      });
      await Assignment.create({ subject, deadline, details });

      await interaction.reply({
        content: "Assignment sent and saved to Database.",
        ephemeral: true,
      });

      //Convering into cron format for cronjob
      const cronTime = `${deadlineDate.minutes()} ${deadlineDate.hours()} ${deadlineDate.date()} ${
        deadlineDate.month() + 1
      } *`;

      //Scheduling the task
      cron.schedule(cronTime, () => {
        // Send message to the assignment channel
        channel.send(
          `Reminder: The assignment "${subject}" is due now! Details: ${details}`
        );
      });
    } catch (error) {
      console.log(error);
    }
  }
  if (interaction.commandName === "assignment") {
    try {
      const assignment = await Assignment.find({});
      let assignmentString = "Pending Assignments:";
      assignment.map((content, index) => {
        assignmentString += `\n\n**${index + 1}. ${
          content.subject
        }** **Deadline:** ${content.deadline}\n**Details:** ${content.details}`;
      });
      await interaction.reply({
        content: assignmentString,
        ephemeral: true,
      });
    } catch (error) {
      console.log(error);
    }
  }
});

//Login for Bot
client.login(process.env.TOKEN);
