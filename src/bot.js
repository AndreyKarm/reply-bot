const { Telegraf } = require('telegraf')
const fs = require('fs')
require('dotenv').config()

const messages = JSON.parse(fs.readFileSync('./src/configs/messages.json', 'utf8'))
let bannedUsers = JSON.parse(fs.readFileSync('./src/data/banlist.json', 'utf8'))

const bot = new Telegraf(process.env.BOT_TOKEN);

const MESSAGE_MAP_PATH = './src/data/messageMap.json'
const WAITING_LIST_PATH = './src/data/waitingList.json'

let messageMapData = {}
let waitingForReplyArray = []

const saveMessageMap = () => {
    const obj = Object.fromEntries(messageMap)
    fs.writeFileSync(MESSAGE_MAP_PATH, JSON.stringify(obj, null, 2))
}
const saveWaitingList = () => {
    const arr = Array.from(waitingForReply)
    fs.writeFileSync(WAITING_LIST_PATH, JSON.stringify(arr, null, 2))
}

try {
    messageMapData = JSON.parse(fs.readFileSync(MESSAGE_MAP_PATH, 'utf8'))
    waitingForReplyArray = JSON.parse(fs.readFileSync(WAITING_LIST_PATH, 'utf8'))
} catch (error) {
    console.log('No existing data found, starting fresh')
}

const messageMap = new Map(Object.entries(messageMapData))
const waitingForReply = new Set(waitingForReplyArray)

if (!process.env.BOT_TOKEN) {
    console.error('BOT_TOKEN is required');
    process.exit(1);
}

if (!process.env.ADMIN_CHAT_ID){
    console.error('ADMIN_CHAT_ID is required');
    process.exit(1);
}

//#region Commands
bot.telegram.setMyCommands([
    {
        command: 'start',
        description: 'Info',
    },
    {
        command: 'setup',
        description: 'ChatID for configuring bot',
    },
    {
        command: 'list',
        description: 'List waiting users',
    },
    {
        command: 'ban',
        description: 'Ban user',
    },
    {
        command: 'unban',
        description: 'Unban user',
    }
], {
    scope: {
        type: 'chat',
        chat_id: process.env.ADMIN_CHAT_ID
    }
});

bot.telegram.setMyCommands([
    {
        command: 'start',
        description: 'Info',
    }
], {
    scope: {
        type: 'all_private_chats'
    }
});
//#endregion

//#region Debug
bot.use((ctx, next) => {
    console.log('--------------------');
    console.log(`Message from ${ctx.chat.type}`);
    console.log(`Chat ID: ${ctx.chat.id}`);
    console.log(`Admin Chat ID: ${process.env.ADMIN_CHAT_ID}`);
    console.log(`Message: ${ctx.message.text}`);
    console.log('--------------------');
    return next();
});
//#endregion

bot.command('start', async (ctx) => ctx.reply(messages["user.welcome"]));

bot.command('setup', async (ctx) => ctx.reply(`${ctx.chat.id}`));

//#region List command
bot.command('list', async (ctx) => {
    console.log('List command triggered');
    try {
        console.log('\n=== LIST COMMAND TRIGGERED ===');
        console.log('Current chat ID:', ctx.chat.id);
        console.log('Target admin ID:', process.env.ADMIN_CHAT_ID);
        
        if (ctx.chat.id.toString() !== process.env.ADMIN_CHAT_ID) {
            console.log('Command rejected - not admin group');
            return;
        }

        console.log('MessageMap size:', messageMap.size);
        console.log('WaitingForReply size:', waitingForReply.size);
        
        const pendingMessages = [...messageMap.entries()].filter(([_, data]) => waitingForReply.has(data.userId));
        
        console.log('Found pending messages:', pendingMessages.length);
        
        if (pendingMessages.length === 0) {
            await ctx.reply(messages["admin.no-pending"]);
            return;
        }

        let response = '*📋 Pending Messages:*\n\n';
        
        pendingMessages.forEach(([msgId, data]) => {
            const waitTime = Math.round((Date.now() - data.timestamp) / 1000 / 60);
            response += `👤 *From:* @${data.username}\n`;
            response += `💬 *Message:* ${data.text}\n`;
            response += `⏱ *Waiting:* ${waitTime} min\n`;
            response += `🔑 *ID:* ${msgId}\n`;
            response += `➖➖➖➖➖➖➖➖\n`;
        });

        await ctx.reply(response, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        
    } catch (error) {
        console.error('List command error:', error);
        await ctx.reply(messages["admin.error"]);
    }
});
//#endregion

//#region Ban command
bot.command('ban', async (ctx) => {
    try {
        // Admin check
        if (ctx.chat.id.toString() !== process.env.ADMIN_CHAT_ID) {
            return;
        }

        // Bot mention check
        if (ctx.message.text.includes('@') && !ctx.message.text.includes(`@${ctx.botInfo.username}`)) {
            return;
        }

        let userToBan;
        let username;

        // Get user from reply or direct command
        if (ctx.message.reply_to_message) {
            const replyToId = ctx.message.reply_to_message.message_id;
            const originalMessage = messageMap.get(replyToId);
            
            if (originalMessage) {
                userToBan = originalMessage.userId;
                username = originalMessage.username;
            }
        } else {
            const args = ctx.message.text.split(' ');
            if (args.length !== 2) {
                await ctx.reply(messages["admin.ban-usage"]);
                // 'Usage: /ban <user_id> or reply to message with /ban'
                return;
            }
            userToBan = args[1];
            username = 'Unknown';
        }

        // // Validate user
        if (!userToBan) {
            await ctx.reply('Error: No valid user specified to ban');
            return;
        }

        // Check if already banned
        if (bannedUsers[userToBan]) {
            await ctx.reply(messages["admin.ban-already"]
                .replace('{username}', username)
                .replace('{userToBan}', userToBan));
            return;
        }

        // Proceed with ban
        bannedUsers[userToBan] = {
            username: username,
            bannedAt: new Date().toISOString()
        };

        fs.writeFileSync('./src/data/banlist.json', JSON.stringify(bannedUsers, null, 2));

        const kyivTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Kiev',
            dateStyle: 'medium',
            timeStyle: 'medium'
        }).format(new Date());
        
        const banMessage = messages["admin.ban-message"].replace('{username}', username).replace('{userToBan}', userToBan).replace('{kyivTime}', kyivTime).replace('{userToBan}', userToBan);

        await ctx.reply(banMessage, { parse_mode: 'Markdown' });
        console.log(`User ${userToBan} (${username}) has been banned`);
        return;
    } catch (error) {
        console.error('Ban command error:', error);
        await ctx.reply(messages["admin.error"]);
        return;
    }
});
//#endregion

//#region Unban command
bot.command('unban', async (ctx) => {
    if (ctx.chat.id.toString() !== process.env.ADMIN_CHAT_ID) {
        return;
    }

    const args = ctx.message.text.split(' ');
    if (args.length !== 2) {
        await ctx.reply(messages["admin.unban-usage"]);
        return;
    }

    const userToUnban = args[1];

    if (!userToUnban) {
        await ctx.reply('Error: No valid user specified to ban');
        return;
    }

    try {
        const username = bannedUsers[userToUnban].username;
        delete bannedUsers[userToUnban];
        
        fs.writeFileSync('./src/data/banlist.json', JSON.stringify(bannedUsers, null, 2));
        
        await ctx.reply(messages["admin.unban-success"].replace('{username}', username).replace('{userToUnban}', userToUnban));
        return;
    } catch (error) {
        console.error('Error while unbanning user:', error);
        await ctx.reply(messages["admin.error"]);
        return;
    }
});
//#endregion

//#region Private message handling
bot.on('message', async (ctx, next) => {
    if (ctx.chat.type !== 'private') {
        return next();
    }
    
    const userId = ctx.from.id;

    // Check if user is banned
    if (bannedUsers[userId]) {
        return;
    }
    
    if (waitingForReply.has(userId)) {
        await ctx.reply(messages["user.waiting"]);
        return;
    }
    
    try {
        const forwarded = await ctx.forwardMessage(
            process.env.ADMIN_CHAT_ID,
            ctx.chat.id,
            ctx.message.message_id
        );
        
        messageMap.set(forwarded.message_id, {
            userChatId: ctx.chat.id,
            messageId: ctx.message.message_id,
            userId: userId,
            username: ctx.from.username || 'Unknown',
            text: ctx.message.text,
            timestamp: Date.now()
        });
        
        waitingForReply.add(userId);
        
        await ctx.reply(messages["user.sent"]);
    } catch (error) {
        console.error('Forward error:', error);
    }
});
//#endregion

//#region Admin message handling
bot.on('message', async (ctx) => {
    if (!['group', 'supergroup'].includes(ctx.chat.type)) {
        return;
    }
    if (ctx.chat.id.toString() !== process.env.ADMIN_CHAT_ID) {
        return;
    }
    try {
        if (ctx.message.reply_to_message) {
            const replyToId = ctx.message.reply_to_message.message_id;
            const originalMessage = messageMap.get(replyToId);
            if (originalMessage) {
                if (ctx.message.photo) {
                    const photo = ctx.message.photo[ctx.message.photo.length - 1];
                    await ctx.telegram.sendPhoto(
                        originalMessage.userChatId,
                        photo.file_id,
                        {
                            caption: ctx.message.caption
                        }
                    );
                } else {
                    await ctx.telegram.sendMessage(
                        originalMessage.userChatId,
                        ctx.message.text
                    );
                }
                waitingForReply.delete(originalMessage.userId);
                console.log('Reply sent to user:', originalMessage.userChatId);
            }
        }
    } catch (error) {
        console.error('Reply error:', error);
    }
});
//#endregion

bot.launch()
    .then(() => console.log('Bot started successfully'))
    .catch(err => console.error('Bot start error:', err));

process.on('SIGINT', () => {
    saveMessageMap()
    saveWaitingList()
    process.exit()
})

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
});