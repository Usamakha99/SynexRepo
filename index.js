const fs = require("fs");
const readline = require("readline");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { exit } = require("process");
const lineByLine = require('n-readlines');
const liner = new lineByLine('./SKUs.txt');
const xlsx = require('xlsx');
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
            if(!title){
                fs.appendFileSync('NotFound.csv',`${skuFromFile}`)
                await page.close();
            }else
            {

            }
            // console.log(title);
            let mfr = await page.$eval(".product-vertical > dd:nth-child(2) > strong:nth-child(1)", (el) => el.textContent.trim());
            let td_sy = await page.$eval(".product-vertical > dd:nth-child(8) > strong:nth-child(1)", (el) => el.textContent.trim());
            let upc = await page.$eval("#technotesFrm > section.panel.technote-main > div.l-g > div:nth-child(2) > div.l-u.l-col-2 > dl > dd:nth-child(10) > strong", (el) => el.textContent.trim());
            // console.log(upc);
            // let image = await page.$eval(".product-main-img", (el) => el.src.trim());
            let price = await page.$eval("td.reg", (el) => el.textContent.trim()); 
            let weight = await page.$eval("#technotesFrm > section.panel.technote-main > div.l-g > div:nth-child(2) > div.l-u.l-col-2 > dl > dd:nth-child(12)", (el) => el.textContent.trim()); 
            // console.log(weight, price)
            let relatedSku1 = await page.$eval("#recentViewedDiv > div.products-content > ul > li:nth-child(1) > div.product-info.block-text-ellipsis", (el) => el.textContent.trim()); 
            // console.log(relatedSku1);
            let relatedSku2 = await page.$eval("#recentViewedDiv > div.products-content > ul > li:nth-child(2) > div.product-info.block-text-ellipsis", (el) => el.textContent.trim()); 
            // console.log(relatedSku2);
            let relatedSku3 = await page.$eval("#recentViewedDiv > div.products-content > ul > li:nth-child(3) > div.product-info.block-text-ellipsis", (el) => el.textContent.trim()); 
            // console.log(relatedSku3);
            let image = await page.evaluate(() => {
                let title = Array.from(
                    document.querySelectorAll(
                        ".product-main-img"
                    )
                ).map((x) => x.src);
                let data = [];
                for (let index = 0; index < title.length; index++) {
                    data.push(title[index]);
                }

                return data; 
            });
            // console.log(image);
		
            let description = await page.$eval("#technotesFrm > section.panel.technote-main > div:nth-child(1) > p", (el) => el.textContent.trim());
            // console.log(description);

            let longDesc = await page.$eval("#technotesFrm > section.panel.technote-main > div.l-g > div.product-info", (el) => el.textContent.trim());
            // console.log(longDesc);
             

			const specs = await page.evaluate(() => {
                let trs = Array.from(
					document.querySelectorAll(
						"#tabContext_spec > ul tr td",
						{ timeout: 0 }
					)
				);
                let data = ''
                for (let index = 0; index < trs.length; index++) {
                    // if(trs.length < 2){
                        if(trs[index].classList.contains('title')){
                            data += trs[index].childNodes[0]?.data
                        }else{
                            data += trs[index].childNodes[0]?.data + " , "
                        }
                    // }
                    
                }
				return data
			});
            // let s = await page.$eval("#tabContext_spec > ul > li:nth-child(1) > div > table", (element) => {
            //     element.innerHTML = element.innerHTML.replace(/\s+/g, '');
            //     const suffix = "<table>";
            //     const prefix = "</table>";
            //     var AfterSpec = suffix + element.innerHTML + prefix;
            //     return AfterSpec;
            //   });
              

              
            fs.appendFileSync('Founds.csv',`${skuFromFile}`);
            let oneImg;
            let multipleImg;
            if (image.length==1) {
                oneImg=image[0];
                multipleImg='';
            }else{
                oneImg=image[0];
                multipleImg=image.slice(1);
            }

			const header = "sku\ttitle\tmfr\ttd_sy\tupc\tweight\tprice\timage\tspecs\tdescription\tlongDescription\tadditional_images\trelated_Sku";
            const sku1 = skuFromFile ? String(skuFromFile).replace(/\n/g, "").trim() : '';

            const line=`${sku1}\t${title}\t${mfr}\t${td_sy}\t${upc}\t${weight}\t${price}\t${oneImg}\t${JSON.stringify(specs)}\t${JSON.stringify(description)}\t${JSON.stringify(longDesc)}\t${multipleImg}\t${relatedSku1},${relatedSku2},${relatedSku3}\n`;


            const fileExists = fs.existsSync('data.xls');
            if (!fileExists) {
            fs.writeFileSync('data.xls', `${header}\n`);
            }

            fs.appendFileSync('data.xls', `${line}\n`);
            await page.close();

            } catch (error) {
                
                console.log(error)
                await page.close();

            }
			
		}
	};

	async function login() {
        return new Promise(async (res, rej)=>{
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
    
            await page.click("#loginBtn")
            console.log("1")
            await page.waitForNavigation({ waitUntil: "networkidle2" }),
            console.log("2")
            await page.close()
            console.log("3")
            res()
        })
	}

    await login();

    while (line = liner.next()) {
        const skuSearchPage = `https://ec.synnex.com/ecx/part/techNote.html?skuNo=${String(line)}`;
        await getProductDetails(skuSearchPage,line);
    }

	


	
})();
