// src/index.js
import express, { Express, Request, Response } from 'express';
import puppeteer from 'puppeteer';
import axios from 'axios';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { time } from 'console';
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server');
});

const axiosAuth = axios.create({
    withCredentials: true,
    baseURL: 'https://frontal.ies-sabadell.cat/cicles-moodle',
});

app.get('/login', async (req: Request, res: Response) => {
    const cookie = await axios.get(
        'https://frontal.ies-sabadell.cat/cicles-moodle/login/token.php',
        {
            params: {
                username: 'e.acabreral',
                password: 'Adria2007!',
                service: 'moodle_mobile_app',
            },
        }
    );

    console.log(cookie.data);

    res.cookie('MoodleSession', cookie.data.token, {});
    res.send(cookie.data);
});
app.post('/courses', async (req: Request, res: Response) => {
    const username = await req.body.username.toString();
    const password = await req.body.password.toString();

    console.log(username, password);
    try {
        const browser = await puppeteer.launch({
            headless: false, // Launch in headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const context = browser.defaultBrowserContext();
        await context.clearPermissionOverrides();
        const pages = await browser.pages();
        for (const page of pages) {
            const cookies = await page.cookies();
            for (const cookie of cookies) {
                await page.deleteCookie(cookie);
            }
        }

        const page = await browser.newPage();
        await page.goto(
            'https://frontal.ies-sabadell.cat/cicles-moodle/login/index.php'
        );

        const maxRetries = 1;
        let loginSuccess = false;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                await page.waitForSelector('#username'); // Ensure the page has loaded properly
                await page.type('#username', username, { delay: 10 });
                await page.type('#password', password, { delay: 10 });
                await page.click('#loginbtn');

                // Wait for navigation to complete
                await page.waitForNavigation({
                    waitUntil: 'domcontentloaded',
                });

                // Check if login was successful by looking for a specific element that appears after login
                const loginError = await page.$('.loginerrors');
                if (!loginError && (await page.$('#page-header'))) {
                    loginSuccess = true;
                    await page.goto(
                        'https://frontal.ies-sabadell.cat/cicles-moodle/my/courses.php'
                    );
                    break;
                }
            } catch (error) {
                console.error(`Login attempt ${attempt + 1} failed:`, error);
            }
        }

        if (!loginSuccess) {
            res.send('Failed to login after multiple attempts').status(500);
            await browser.close();
        }

        try {
            // Wait for the element to be available

            await page.waitForSelector('.col.d-flex.px-0.mb-2'); // Ensure the page has loaded properly

            const courses = await page.evaluate(() => {
                const courses = Array.from(
                    document.querySelectorAll('.col.d-flex.px-0.mb-2')
                ).map((course) => {
                    const titleElement = course.querySelector('.coursename');
                    const title = titleElement
                        ? titleElement.textContent?.trim()
                        : 'No title';
                    const linkElement = course.querySelector('a');
                    const link = linkElement ? linkElement.href : 'No link';
                    const imageElement = course.querySelector('.card-img-top');
                    const imageUrl = imageElement
                        ? (
                              imageElement as HTMLElement
                          ).style.backgroundImage.slice(5, -2)
                        : 'No image';
                    return { title, link, imageUrl };
                });
                return courses;
            });

            const detailedCourses = await Promise.all(
                courses.map(async (course) => {
                    const coursePage = await browser.newPage();
                    await coursePage.goto(course.link);
                    // Extract additional details if needed

                    // Extract the required items
                    const items = await coursePage.evaluate(() => {
                        const sections = Array.from(
                            document.querySelectorAll('.section.course-section')
                        );
                        return sections.map((section) => {
                            const sectionTitleElement =
                                section.querySelector('.sectionname a');
                            const sectionTitle = sectionTitleElement
                                ? sectionTitleElement.textContent?.trim()
                                : 'No title';
                            const activities = Array.from(
                                section.querySelectorAll('.activity-wrapper')
                            ).map((activity) => {
                                const activityTitleElement =
                                    activity.querySelector('.activityname a');
                                const activityTitle = activityTitleElement
                                    ? activityTitleElement.textContent?.trim()
                                    : 'No title';
                                const activityLink = activityTitleElement
                                    ? (
                                          activityTitleElement as HTMLAnchorElement
                                      ).href
                                    : 'No link';
                                return { activityTitle, activityLink };
                            });
                            return { sectionTitle, activities };
                        });
                    });

                    await coursePage.close();
                    return { course, items };
                })
            );

            res.send(detailedCourses);

            await browser.close();
        } catch (error) {
            console.error('Error during navigation:', error);
            res.status(500).send('Error during navigation');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Error during login');
    }
});

app.get('/courses2', async (req: Request, res: Response) => {
    try {
        const cookie = req.cookies.MoodleSession.toString();
        console.log(cookie);

        const page = await axios.get(
            'https://frontal.ies-sabadell.cat/cicles-moodle/course/view.php?id=18',
            {
                headers: {
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Accept-Language': 'es-US,es-419;q=0.9,es;q=0.8,ca;q=0.7',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                    Cookie: `MoodleSession=${cookie}`,
                    Host: 'frontal.ies-sabadell.cat',
                    Pragma: 'no-cache',
                    Referer:
                        'https://frontal.ies-sabadell.cat/cicles-moodle/login/index.php',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    'User-Agent':
                        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
                    'sec-ch-ua':
                        '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-ch-ua-platform': '"Android"',
                },
            }
        );

        console.log(page);

        res.send(page.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching course data');
    }
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
