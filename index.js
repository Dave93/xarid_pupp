const browserObject = require("./browser");
const scraperController = require("./pageController");

const CronJob = require("cron").CronJob;
var job = new CronJob(
  "0 0 9 * * *",
  async () => {
    //Start the browser and create a browser instance
    let browserInstance = browserObject.startBrowser();

    // Pass the browser instance to the scraper controller
    scraperController(browserInstance);
  },
  null,
  true,
  "Asia/Tashkent"
);
job.start();
