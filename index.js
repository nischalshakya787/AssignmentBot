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

//Channel to send the notify other(like assignment channel);
const channel = client.channels.cache.get(process.env.CHANNEL_ID);

// Calculate Time Remaining
const timeRemaining = (deadline) => {
  const currentTime = new Date();
  const deadlineTime = new Date(deadline);
  deadlineTime.setUTCHours(16, 0, 0, 0);
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
  //Creating Commands: [/setAssignment,/assignment: to view Pending Assignments]
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

    const deadlineDate = moment(deadline + "16:00", "YYYY-MM-DD HH:mm"); // Set time to 4 PM

    // Validation if user sets time at past
    if (deadlineDate.isBefore(moment())) {
      return interaction.reply("The deadline cannot be in the past.");
    }

    //Returns TimeRemaining from today date to deadline
    const timeRemainingString = timeRemaining(deadline);

    try {
      //Stores the message in mongoDB
      await Assignment.create({ subject, deadline, details });

      //Response to send all
      channel.send({
        content:
          ` @everyone\n **Assignment Details**\n` +
          `**Subject**: ${subject}\n` +
          `**Deadline**: ${deadline}\n` +
          `**Time Remaining**: ${timeRemainingString}\n` +
          `**Details**: ${details || "No additional details provided."}`,
      });

      //Responses if no error occurs
      await interaction.reply({
        content: "Assignment sent and saved to Database.",
        ephemeral: true,
      });

      const reminderDate = deadlineDate.clone().subtract(1, "days");
      //Convering into cron format for 1 day before the deadline for cronjob
      const cronTime = `${reminderDate.minutes()} ${reminderDate.hours()} ${reminderDate.date()} ${
        reminderDate.month() + 1
      } *`;

      //Scheduling the task
      cron.schedule(cronTime, () => {
        // Send message to the assignment channel
        channel.send(
          `@everyone\n **Reminder🔔🔔:**\n The assignment of **Subject:**"${subject} is due: **1 day**"\n**Details:** ${details}`
        );
      });
    } catch (error) {
      console.log(error);
      interaction.reply({
        content: "An error occurred. Please try again later.",
        ephemeral: true,
      });
    }
  }
  if (interaction.commandName === "assignment") {
    //Slicing Date to YYYY-MM-DD format
    const todaysDate = new Date().toISOString().slice(0, 10);
    try {
      const assignment = await Assignment.find({
        deadline: { $gte: todaysDate },
      }); //Returns the assignment which has not extended todaysDate

      let assignmentString = "Pending Assignments:";

      //Converting into readable format
      if (assignment.length != 0) {
        //If there is Assignments Assigned
        assignment.map((content, index) => {
          assignmentString += `\n\n**${index + 1}. ${
            content.subject
          }** **Deadline:** ${content.deadline}\n**Details:** ${
            content.details
          }`;
        });
      } else {
        //If there is no Assignments Assigned
        assignmentString +=
          "\n Currently no Assignments has been Assigned. Be A Chill Guy!!";
      }
      //Sends an ephemeral message
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
