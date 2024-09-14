// src/index.js
import express, { Express, Request, Response } from 'express';
import puppeteer from 'puppeteer';
import axios from 'axios';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

// apply jwt middleware

const app: Express = express();
const port = process.env.PORT || 3000;

const protectedEndpoints = ['/courses', '/sessionid'];

const moodle_url = process.env.MOODLE_URL;
const SESSIONID = process.env.SESSIONID;
const HEADLESS = process.env.HEADLESS == 'true';
const DEBUG = process.env.DEBUG == 'true';
function writeLogMessage(message: string) {
    if (DEBUG) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }
}

app.use((req: Request, res: Response, next) => {
    console.log(`${req.ip} ${req.method} ${req.path}`);

    const secretKey = req.header('x-secret-key')?.toString();
    //writeLogMessage(secretKey, SESSIONID);
    if (secretKey != SESSIONID && protectedEndpoints.includes(req.path)) {
        return res.status(403).send('Forbidden: Invalid or missing secret key');
    }

    next();
});

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
    const endpoints = [
        { method: 'GET', path: '/' },
        {
            method: 'POST',
            path: '/sessionid',
            body: { username: '', password: '' },
            header: { 'x-secret-key': '' },
        },
        {
            method: 'POST',
            path: '/courses',
            body: { username: '', password: '' },
            header: { 'x-secret-key': '' },
        },
    ];
    res.json(endpoints);
});

app.post('/sessionid', async (req: Request, res: Response) => {
    const username = req.body.username.toString();
    const password = req.body.password.toString();
    const sessionData = req.session;
    writeLogMessage(JSON.stringify(sessionData));
    const cookie = await axios.get(`${moodle_url}/login/token.php`, {
        params: {
            username: username,
            password: password,
            service: 'moodle_mobile_app',
        },
    });

    writeLogMessage(JSON.stringify(cookie.data));

    res.cookie('MoodleSession', cookie.data.token, {});
    res.send(cookie.data);
});
app.post('/courses', async (req: Request, res: Response) => {
    const username = req.body.username.toString();
    const password = req.body.password.toString();

    writeLogMessage(`Attempting login with username: ${username}`);

    try {
        const browser = await puppeteer.launch({
            headless: HEADLESS, // Launch in headless mode
            //executablePath: '/usr/bin/google-chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        try {
            let currentUrl = page.url();
            let loginAttempts = 0;
            const maxAttempts = 3;

            while (loginAttempts < maxAttempts) {
                writeLogMessage('Opening login page');
                await page.goto(`${moodle_url}/my/courses.php`, {
                    waitUntil: 'networkidle0',
                });

                if (!currentUrl.includes('login/index.php')) {
                    writeLogMessage('Logging in');
                    // Log the initial URL
                    writeLogMessage('Current page: ' + page.url());

                    // Ensure the login form is visible
                    await page.waitForSelector('#username');
                    await page
                        .type('#username', username, { delay: 30 })
                        .then(() => writeLogMessage('user typed'));
                    await page
                        .type('#password', password, { delay: 30 })
                        .then(() => writeLogMessage('password typed'));
                    await page.click('#loginbtn');
                    writeLogMessage('Login button clicked');

                    // Wait for navigation to complete
                    // Log the URL after navigation
                    currentUrl = await page.url();
                    writeLogMessage('Current URL after login: ' + currentUrl);

                    // Check if login was successful
                    if (!currentUrl.includes('login/index.php')) {
                        writeLogMessage('Login successful');
                        break;
                    } else {
                        writeLogMessage('Login failed, still on login page');
                    }
                } else {
                    writeLogMessage('Already logged in');
                    break;
                }

                loginAttempts++;
                if (loginAttempts >= maxAttempts) {
                    writeLogMessage('Max login attempts reached');
                    return res
                        .status(500)
                        .send('Login failed after multiple attempts');
                }
            }

            // Continue with your logic here...
        } catch (error) {
            writeLogMessage('Error during login: ' + error);
            return res.status(500).send('Error during login');
        }

        //writeLogMessage('aaaaaaa')

        await page.goto(`${moodle_url}/my/courses.php`);
        await page.waitForSelector('.col.d-flex.px-0.mb-2'); // Ensure the page has loaded properly
        let currentUrl = await page.url();

        writeLogMessage('courses url: ' + currentUrl);
        if (currentUrl != `${moodle_url}/my/courses.php`) {
            res.send('not logged').status(202);
        } else {
            writeLogMessage('into courses avoiding error');
        }

        currentUrl = await page.url();
        writeLogMessage('Fetching courses: ' + currentUrl);

        const courses = await page.evaluate(() => {
            return Array.from(
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
                    ? (imageElement as HTMLElement).style.backgroundImage.slice(
                          5,
                          -2
                      )
                    : 'No image';
                return { title, link, imageUrl };
            });
        });

        //writeLogMessage(courses)

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
                                ? (activityTitleElement as HTMLAnchorElement)
                                      .href
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

        await browser.close();
        writeLogMessage('results sended');

        return res.send(detailedCourses);
    } catch (error) {
        writeLogMessage('Error during login or fetching courses: ' + error);
        res.status(500).send('Error during login or fetching courses');
    }
});

app.listen(port, () => {
    writeLogMessage(`[server]: Server is running at http://localhost:${port}`);
});
