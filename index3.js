const fs = require("fs");
const readline = require("readline");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { exit } = require("process");
const lineByLine = require('n-readlines');
const liner = new lineByLine('./SKUs.txt');
let line;

(async () => {
    const browser = await puppeteer.launch({ headless: false }, { timeout: 0 });

    async function autoScroll(page) {
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                var totalHeight = 0;
                var distance = 100;
                var timer = setInterval(() => {
                    var scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight - window.innerHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    const getProductDetails = async (link, skuFromFile) => {
        console.log("Sku : " + skuFromFile);
        if (link) {
            const page = await browser.newPage({ timeout: 0 });

            await page.goto(link, { timeout: 0, waitUntil: "networkidle2" });
            await new Promise(resolve => setTimeout(resolve, 5000));

            try {
                let title = await page.$eval("#technotesFrm > section.panel.technote-main > div:nth-child(1) > h1", (el) => el.textContent.trim());
                if (!title) {
                    fs.appendFileSync('NotFound.csv', `${skuFromFile}`);
                    await page.close();
                } else {
                    let mfr = await page.$eval(".product-vertical > dd:nth-child(2) > strong:nth-child(1)", (el) => el.textContent.trim());
                    let td_sy = await page.$eval(".product-vertical > dd:nth-child(8) > strong:nth-child(1)", (el) => el.textContent.trim());
                    let upc = await page.$eval("#technotesFrm > section.panel.technote-main > div.l-g > div:nth-child(2) > div.l-u.l-col-2 > dl > dd:nth-child(10) > strong", (el) => el.textContent.trim());
                    let price = await page.$eval("td.reg", (el) => el.textContent.trim());
                    let weight = await page.$eval("#technotesFrm > section.panel.technote-main > div.l-g > div:nth-child(2) > div.l-u.l-col-2 > dl > dd:nth-child(12)", (el) => el.textContent.trim());
                    let relatedSku1 = await page.$eval("#recentViewedDiv > div.products-content > ul > li:nth-child(1) > div.product-info.block-text-ellipsis", (el) => el.textContent.trim());
                    let relatedSku2 = await page.$eval("#recentViewedDiv > div.products-content > ul > li:nth-child(2) > div.product-info.block-text-ellipsis", (el) => el.textContent.trim());
                    let relatedSku3 = await page.$eval("#recentViewedDiv > div.products-content > ul > li:nth-child(3) > div.product-info.block-text-ellipsis", (el) => el.textContent.trim());
                    let image = await page.evaluate(() => {
                        let title = Array.from(
                            document.querySelectorAll(".product-main-img")
                        ).map((x) => x.src);
                        let data = [];
                        for (let index = 0; index < title.length; index++) {
                            data.push(title[index]);
                        }
                        return data;
                    });
                    let description = await page.$eval("#technotesFrm > section.panel.technote-main > div:nth-child(1) > p", (el) => el.textContent.trim());
                    let longDesc = await page.$eval("#technotesFrm > section.panel.technote-main > div.l-g > div.product-info", (el) => el.textContent.trim());
                    let s = await page.$eval("#tabContext_spec > ul > li:nth-child(1) > div > table", (element) => {
                        element.innerHTML = element.innerHTML.replace(/\s+/g, '');
                        const suffix = "<table>";
                        const prefix = "</table>";
                        var AfterSpec = suffix + element.innerHTML + prefix;
                        return AfterSpec;
                    });

                    const sku1 = skuFromFile ? String(skuFromFile).replace(/\n/g, "").trim() : '';
                    const titleTab = title ? title.replace(/\t/g, " ") : '';
                    const mfrTab = mfr ? mfr.replace(/\t/g, " ") : '';
                    const td_syTab = td_sy ? td_sy.replace(/\t/g, " ") : '';
                    const upcTab = upc ? upc.replace(/\t/g, " ") : '';
                    const weightTab = weight ? weight.replace(/\t/g, " ") : '';
                    const priceTab = price ? price.replace(/\t/g, " ") : '';
                    const imageTab = image ? image.join(", ").replace(/\t/g, " ") : '';
                    const specsTab = s ? s.replace(/\t/g, " ") : '';
                    const descriptionTab = description ? description.replace(/\t/g, " ") : '';
                    const longDescTab = longDesc ? longDesc.replace(/\t/g, " ") : '';
                    const additionalImagesTab = image && image.length > 1 ? image.slice(1).join(", ").replace(/\t/g, " ") : '';
                    const relatedSkuTab = [relatedSku1, relatedSku2, relatedSku3].map(sku => sku ? sku.replace(/\t/g, " ") : '').join(",");

                    const header = "sku\ttitle\tmfr\ttd_sy\tupc\tweight\tprice\timage\tspecs\tdescription\tlongDescription\tadditional_images\trelated_Sku";
                    const line = `${sku1}\t${titleTab}\t${mfrTab}\t${td_syTab}\t${upcTab}\t${weightTab}\t${priceTab}\t${imageTab}\t${specsTab}\t${descriptionTab}\t${longDescTab}\t${additionalImagesTab}\t${relatedSkuTab}\n`;

                    const fileExists = fs.existsSync('data3.xls');
                    if (!fileExists) {
                        fs.writeFileSync('data3.xls', `${header}\n`);
                    }

                    fs.appendFileSync('data3.xls', `${line}\n`);
                    await page.close();
                }
            } catch (error) {
                console.log(error);
                await page.close();
            }
        }
    };

    async function login() {
        return new Promise(async (res, rej) => {
            let loginURL = "https://ec.synnex.com/ecx/login.html";
            const page = await browser.newPage({ timeout: 0 });
            await page.setViewport({
                width: 1200,
                height: 720,
                deviceScaleFactor: 1,
            });
            await page.goto(loginURL, { timeout: 0 });
            await page.waitForSelector("#inputEmailAddress", { timeout: 0 });
            await page.focus("#inputEmailAddress");
            await page.keyboard.type("devteam@vcloudchoice.com");
            await new Promise(resolve => setTimeout(resolve, 3000));
            await page.focus("#inputPassword");
            await page.keyboard.type("Califori12$#@");

            await page.click("#loginBtn");
            console.log("1");
            await page.waitForNavigation({ waitUntil: "networkidle2" }),
                console.log("2");
            await page.close();
            console.log("3");
            res();
        });
    }

    await login();

    while (line = liner.next()) {
        const skuSearchPage = `https://ec.synnex.com/ecx/part/techNote.html?skuNo=${String(line)}`;
        await getProductDetails(skuSearchPage, line);
    }
})();
