const { PendingXHR } = require("pending-xhr-puppeteer");
const currency = require("currency.js");
const nodeFetch = require("node-fetch");

const links = [
  "https://exarid.uzex.uz/ru/competitive",
  "https://exarid.uzex.uz/ru/bestoffer",
  "https://exarid.uzex.uz/ru/tender2",
];

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const scraperObject = {
  //Change url to link you're scraping from
  url: "https://exarid.uzex.uz/ru/competitive",
  async scraper(browser) {
    let page = await browser.newPage();
    console.log(`Navigating to ${this.url}...`);
    const pendingXHR = new PendingXHR(page);

    const data = JSON.stringify({
      method: "get.lots.keywords",
    });

    const response = await nodeFetch("https://prouniforma.uz/api/", {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "application/json",
        ApiToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      },
    });

    const { data: responseData } = await response.json();

    console.log(responseData);

    await asyncForEach(links, async (link) => {
      await page.goto(link);
      // await page.waitForTimeout(5000);
      //Enter following code here

      await pendingXHR.waitForAllXhrFinished();
      await asyncForEach(responseData, (keyword) => {
        await page.$eval("#Filter_LotID", (node) => (node.value = keyword));

        await page.$eval("#Filter_TypeID", (node) => (node.value = 1));
        // lotActiveFilter.value = 1;

        const filterToggle = await page.$(".filter_toggle");
        await filterToggle.click();

        const filterSubmitButton = await page.$(".confirm_filter");
        await filterSubmitButton.click();

        await pendingXHR.waitForAllXhrFinished();

        await page.waitForTimeout(300);

        const errorModalIsVisible = await page.evaluate(() => {
          const element = document.querySelector(".sa-error.animateErrorIcon");
          if (!element) {
            return false;
          }
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            style.visibility !== "hidden" &&
            !!(rect.bottom || rect.top || rect.height || rect.width)
          );
        });

        console.log(errorModalIsVisible);

        if (!errorModalIsVisible) {
          let rows = await page.evaluate(() => {
            const table = document.querySelector("#table_main");
            const rows = table.tBodies[0].rows;
            const result = [...rows].map((row) => {
              const item = {};
              const cells = row.cells;
              if (cells.length <= 1) {
                return null;
              }
              item.date = cells[1].innerText;
              item.id = cells[2].innerText;
              item.url =
                "https://exarid.uzex.uz" +
                cells[2].querySelector("a").getAttribute("href");
              item.region = cells[3].innerText;
              item.district = cells[4].innerText;
              item.name = cells[5].innerText;
              item.price = cells[6].innerText;
              return item;
            });

            return result;
          });

          rows = rows.filter((item) => item !== null);

          rows = rows.map((row) => {
            const price = row.price;
            row.price = currency(price).value;
            return row;
          });
          const data = JSON.stringify({
            method: "set.lots",
            data: {
              items: rows,
            },
          });

          const response = await nodeFetch("https://prouniforma.uz/api/", {
            method: "POST",
            body: data,
            headers: {
              "Content-Type": "application/json",
              ApiToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
            },
          });
        }
      });
    });

    console.log("davr");

    //Program successfully completed
    await browser.close();
    console.log("Program completed!");
  },
};

module.exports = scraperObject;
