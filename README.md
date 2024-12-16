# Telegram Reply Bot

A Telegram bot that forwards user messages to an admin chat and allows admins to reply directly to users.

## Features

- Forward messages from users to admin chat
- Reply to users through the admin chat
- Ban/unban users
- List pending messages
- Support for text messages and photos
- Admin commands for managing users

## Dependencies

- Node.js: [Install Node.js](https://nodejs.org/en/download/package-manager/current)
- npm packages:
    - telegraf
    - dotenv
    - nodemon

## Setup Instructions

1. Clone or download this repository
2. Copy `example.env` to `.env`:
    `shcp example.env .env`
3. Create a new Telegram bot:
    - Message [@BotFather](https://t.me/BotFather) on Telegram
    - Use `/newbot` command to create a bot
    - Copy the provided bot token
    - Paste the token in `.env` file: `BOT_TOKEN="your-token-here"`

4. Set up admin chat:
    - Create a new group chat in Telegram
    - Add your bot to the group
    - Run `npm run start` to start the bot
    - In the group chat, use `/setup` command
    - Copy the displayed Chat ID
    - Add the Chat ID to `.env`: `ADMIN_CHAT_ID="your-chat-id"`

5. Install dependencies and start:
    ```sh
    npm install
    npm run start
    ```
## Available Commands

- `/start` - Display welcome message (users)
- `/setup` - Get chat ID (admin)
- `/list` - Show pending messages (admin)
- `/ban` - Ban a user (admin)
- `/unban` - Unban a user (admin)

## Usage

1. Users can send messages to the bot in private chat
2. Messages are forwarded to the admin group
3. Admins can reply to forwarded messages to respond to users
4. Use admin commands to manage users and view pending messages

## License

ISC License

## Author

[AndreyKarm](https://github.com/AndreyKarm)