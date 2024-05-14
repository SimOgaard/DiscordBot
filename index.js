require('dotenv').config();

const { ActivityType, GatewayIntentBits, Partials, Client } = require('discord.js');
const { spawn } = require('child_process');

const fetch = require('node-fetch');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ]
});

class Server {
    constructor(client, startupScriptLocation) {
        this.startupScriptLocation = startupScriptLocation;
        this.startupScript = startupScriptLocation + '\\start.bat';
        this.isStarting = false;
        this.isStarted = false;
        this.client = client;
    }

    init() {
        this.client.on('messageCreate', async (message) => {
            this.command(message);
        });
        this.client.login(process.env.DISCORD_TOKEN);
        this.client.once('ready', () => {
            this.setActivity('idle', 'Idle');
        });
        
        console.log('Bot Started');
    }

    setIsStarted(isStarted) {
        if (isStarted === this.isStarted)
            return;
        this.isStarted = isStarted;
        if (this.isStarted) {
            this.setActivity('online', 'Hosting');
        }
        else {
            this.setActivity('idle', 'Idle');
        }
    }

    setIsStarting(isStarting) {
        if (isStarting === this.isStarting)
            return;
        this.isStarting = isStarting;
        if (this.isStarting) {
            this.setActivity('online', 'Starting...');
        }
    }

    async status() {
        try {
            await fetch(process.env.SERVER_ADDRESS);
            this.setIsStarted(true);
            this.setIsStarting(false);
        } catch (error) {
            this.setIsStarted(false);
        }
    }

    async checkStatus(message) {
        //await this.status();
        if (this.isStarted) {
            message.reply(`Server is running on: ${process.env.SERVER_ADDRESS}`);
            return true;
        }
        if (this.isStarting) {
            message.reply('Server is starting...');
            return true;
        }
        message.reply('Server is offline');
        return false;
    }

    setActivity(status, activity) {
        console.log(status, activity);
        client.user.setPresence({
            status: status,
            activities: [{
                type: ActivityType.Custom,
                name: 'serverstatus',
                state: activity
            }]
        });
    }

    command(message) {
        if (message.author.bot)
            return;

        if (message.content === '!s' || message.content === '!start') {
            this.start(message);
            return;
        }
    
        if (message.content === '!q' || message.content === '!quit') {
            this.stop(message);
            return;
        }
            
        if (message.content === '!status') {
            this.checkStatus(message);
            return;
        }

        if (message.content[0] === '!') {
            this.commandList(message);
            return;
        }
    }

    commandList(message) {
        message.reply('Command list for stupid dumb dumb head:\n!s or !start\n!q or !quit\n!status');
    }

    start(message) {
        if (this.isStarting) {
            message.reply('Server is starting, wait...');
            return;
        }
        if (this.isStarted) {
            message.reply('Server is already running');
            return;
        }
    
        message.reply(`Starting server...`);
        this.setIsStarting(true);
    
        this.bat = spawn('cmd.exe', ['/c', `cd ${this.startupScriptLocation} && start.bat`]);
        this.bat.stdout.on('data', (data) => {
            console.log(data.toString());
            if (data.toString().includes('Reloaded server')) {
                message.reply(`Server is running on: ${process.env.SERVER_ADDRESS}`);
                this.setIsStarting(false);
                this.setIsStarted(true);
            }
        });
    }

    stop(message) {
        if (this.isStarting) {
            message.reply('Server is starting, wait...');
            return;
        }        

        if (!this.isStarted) {
            message.reply('Server is not running...');
            return;
        }

        this.bat.stdin.write("/stop\r");
        if (this.bat.kill())
        {
            message.reply('Stopping server...');
            this.setIsStarted(false);
            return;
        }
        
        message.reply('Could not stop server...');
    }
}

module.exports = Server;

const server = new Server(client, process.env.ULTIMATE_RELOADED);
server.init();