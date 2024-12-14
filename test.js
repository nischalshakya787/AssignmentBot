import moment from "moment";

const deadlineDate = moment("2024-12-15" + "16:00", "YYYY-MM-DD HH:mm");
const reminderDate = deadlineDate.clone().subtract(1, "days");
//Convering into cron format for 1 day before the deadline for cronjob
const cronTime = `${reminderDate.minutes()} ${reminderDate.hours()} ${reminderDate.date()} ${
  reminderDate.month() + 1
} *`;
console.log(cronTime);
