This is the "Save D Seas" website repository :)
***Devlogs are inside the Devlogs folder*** <======= IMPORTANT

vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

================================================================
LOCAL INSTALLATION AND RUNNING GUIDE - CLEANDSEAS
================================================================

PREREQUISITES:
1. Node.js installed (version 16 or higher recommended).
2. A Google Cloud account (to set up Google Sign-In <=== OAuth).
3. A MongoDB database (either local or using MongoDB Atlas in the cloud).

STEP 1: INSTALL DEPENDENCIES
----------------------------------------------------------------
Inside of the terminal in the project's root folder run the following command:

==========>npm install

This will download all necessary libraries (express, mongoose, ejs, etc.).

STEP 2: ENVIRONMENT VARIABLES CONFIGURATION (.env)
----------------------------------------------------------------
The server.js file looks for sensitive variables that are not in the code.
Create a file named ".env" (without quotes) in the root of the project.
Copy and paste the following content into .env and fill in your details:

    # Server Port (defaults to 3001 :D)
    PORT=3001
    
    # MongoDB Connection URL
    for example: "MONGODB_URI=mongodb://localhost:27017/cleandseas_db"
    
    # Google OAuth Credentials (Required for Login)
    # From https://console.cloud.google.com/
    GOOGLE_CLIENT_ID=your_client_id_here
    GOOGLE_CLIENT_SECRET=your_client_secret_here
    
    # Secret key for sessions (just write whatever, just make it long and crazy, around 16~18 characters)
    SESSION_SECRET=a_super_secure_secret_phrase
    
    # Environment (keep it as development for local testing <==== SUPER IMPORTANT XD)
    NODE_ENV=development

STEP 3: RUN THE PROJECT
----------------------------------------------------------------
Once the .env file is created, run in the terminal:

npm start

If you have "nodemon" installed and want the server to restart automatically when saving changes:

npm run dev

STEP 4: VERIFY IN THE BROWSER
----------------------------------------------------------------
Open your web browser and navigate to:

    http://localhost:3001

================================================================
COMMON TROUBLESHOOTING
================================================================
1. "Error: MONGODB_URI is not defined":
==========> Make sure you have created the .env file correctly.

2. Google login fails:
==========> Check that the CLIENT_ID and SECRET in the .env file are correct.

3. Styles are not loading:
==========> Ensure that the "public" folder contains the "css" and "images" folders. (happened once XD)


