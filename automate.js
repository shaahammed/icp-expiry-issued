import axios from "axios";
import puppeteer from 'puppeteer';
import { setTimeout } from "timers/promises";



const ID_NUMBER = '784199532621622';

async function getCaptchaSolution(siteKey, pageUrl, apiKey) {
  console.log('getcaptchaSolution called');
  
    const response = await axios.post('https://api.capsolver.com/createTask', {
        clientKey: apiKey,
        task: {
            type: 'ReCaptchaV2Task',
            websiteURL: pageUrl,
            websiteKey: siteKey,
        },
    });

    const taskId = response.data.taskId;
    let solution = '';

    // Polling for the solution
    while (!solution) {
      console.log('entered while loop');
      
        const result = await axios.post('https://api.capsolver.com/getTaskResult', {
            clientKey: apiKey,
            taskId: taskId,
        });

        if (result.data.status === 'ready') {
          console.log('ready');

            solution = result.data.solution.gRecaptchaResponse;
        } else {
          console.log('not ready');
          
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying
        }
    }

    console.log('returning sollution');
    return solution;
    
}


(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const siteKey = '6Lfj6nIUAAAAAD76VheUIK0jYhKYxJRdQF8eG7lh';
    const pageUrl = 'https://smartservices.icp.gov.ae/echannels/web/client/default.html#/fileValidity';
    const apiKey = 'CAP-987ED8EA205B0374FB55E487E2CF1873';

    
    await page.goto(pageUrl);

    // 1. Select Emirates ID
    await page.waitForSelector('input[ng-model="inquiryAboutIDN"]');
    await page.click('input[ng-model="inquiryAboutIDN"]');

    // 2. Select File Type (Emirates ID Number - 3rd radio button)
    const fileTypeRadio = await page.waitForSelector(
      'xpath///span[contains(., "Emirates ID Number")]/input',
      { visible: true, timeout: 30000 }
  );
  await fileTypeRadio.click();

  // Wait for the correct form section (showFileDetails == 3)
  await page.waitForSelector('div[ng-if="showFileDetails == 3"]', {
      visible: true,
      timeout: 30000
  });

  // 3. Enter Emirates ID Number (NOW USING applicantIdentityNumber MODEL)
  await page.waitForSelector('[ng-model="file.applicantIdentityNumber"]');
  await page.type('[ng-model="file.applicantIdentityNumber"]', ID_NUMBER);


    // 4. Enter Nationality
    await page.waitForSelector('.tahalufselect input');
    await page.type('.tahalufselect input', '205');
    


    // 5. Set Date of Birth - Enhanced with proper formatting
    await page.waitForSelector('[ng-model="file.dateOfBirth"]');
    await page.click('[ng-model="file.dateOfBirth"]');
    await page.evaluate(() => {
        const dobInput = document.querySelector('[ng-model="file.dateOfBirth"]');
        dobInput.value = '11/11/1995';
        dobInput.dispatchEvent(new Event('input'));
        dobInput.dispatchEvent(new Event('change'));
    });


    const captchaSolution = await getCaptchaSolution(siteKey, pageUrl, apiKey);
    

    await page.evaluate((captchaSolution) => {
      document.querySelector('#g-recaptcha-response').innerHTML = captchaSolution}, captchaSolution);

    console.log(captchaSolution, 'hloo');

    // 6. Click Search - Added additional checks
    await page.waitForSelector('button[ng-click="loadDetails()"]:not([disabled])');
    await page.click('button[ng-click="loadDetails()"]');

    // Add proper waiting instead of deprecated waitForTimeout
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await browser.close();
})();