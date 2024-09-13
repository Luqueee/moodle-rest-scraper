# **Moodle Course and Session Scraper**

A web scraper designed for extracting course and session information from Moodle, tailored for educational institutions or users looking to automate the process of retrieving their course data.

---

## **Table of Contents**

-   [**Moodle Course and Session Scraper**](#moodle-course-and-session-scraper)
    -   [**Table of Contents**](#table-of-contents)
    -   [**Installation**](#installation)
    -   [**Usage**](#usage)
    -   [**Deploying with PM2**](#deploying-with-pm2)
    -   [**Contributing**](#contributing)
    -   [License](#license)

---

## **Installation**

Follow these steps to set up the development environment:

1. **Clone the repository:**

    ```bash
    git clone https://github.com/moodle-tracker/moodle-rest-api.git
    ```

2. **Navigate to the project directory:**

    ```bash
    cd moodle-rest-api
    ```

3. **Install the required dependencies:**
    ```bash
    npm install
    ```

---

## **Usage**

Run the application locally using the following command:

```bash
npm run dev
```

## **Deploying with PM2**

To deploy the application using PM2 on a Debian system:

1. **Install PM2 globally:**

    ```bash
    npm install pm2 -g
    ```

2. Set up the PM2 script:

    ```bash
    chmod +x pm2.sh
    ./pm2.sh
    ```

## **Contributing**

1. **Fork the repository.**
2. **Create a new feature branch:**
    ```bash
    git checkout -b feature-branch
    ```
3. **Make your changes and commit them:**

    ```bash
    git commit -m 'Add some feature'
    ```

4. **Push the branch to your fork:**
    ```bash
    git push origin feature-branch
    ```
5. **Open a pull request to the main repository.**

## License

This project is licensed under the MIT License. See the [License](License) file for more details.
