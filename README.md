# Discord Giveaway Bot 🎉

A feature-rich giveaway bot for Discord with both slash and prefix commands, reaction-based entries, and winner management.

## ✨ Features

- ✅ **Dual Command Support** - Slash (`/`) and prefix (`!`) commands
- ⏱️ **Natural Time Parsing** - Supports formats like `1d`, `2h 30m`, `1week`
- 🎉 **Reaction-Based Entry** - Users react to join giveaways
- 🔄 **Reroll System** - Pick new winners after a giveaway ends
- 📊 **Statistics Tracking** - View active/ended giveaways and server stats
- 🛡️ **Permission Controls** - Only admins can manage giveaways
- 📜 **Embed-Based UI** - Clean, professional-looking giveaways

## 🚀 Installation

1. **Install Node.js** (v16+ recommended)
2. **Clone the repository**:
   ```bash
   git clone https://github.com/Unknownzop/GiveawayBot.git
   cd GiveawayBot
   ```
3. **Install dependencies**:
   ```bash
   npm install discord.js dotenv express ms
   ```
4. **Configure your bot**:
   - Create `.env` file:
     ```ini
     TOKEN=your_bot_token_here
     CLIENT_ID=your_client_id_here
     PREFIX=!
     PORT=3000
     ```
5. **Start the bot**:
   ```bash
   node index.js
   ```

## 📜 Commands

### 🎁 Giveaway Commands
| Command | Description | Example |
|---------|-------------|---------|
| `!start #channel 1d Nitro 1` | Start a giveaway | `!start #giveaways 2h Discord Nitro 3` |
| `!end <message_id>` | End a giveaway early | `!end 123456789012345678` |
| `!reroll <message_id>` | Reroll winners | `!reroll 123456789012345678` |

### ℹ️ Info Commands
| Command | Description |
|---------|-------------|
| `!stats` | Show bot statistics |
| `!invite` | Get bot invite link |
| `!support` | Get support server link |
| `!help` | Show command help |

Slash commands (`/`) are also available with the same functionality.

## 🔧 Configuration

Edit the `.env` file to customize:
```ini
TOKEN=your_bot_token
CLIENT_ID=your_client_id
PREFIX=!  # Change command prefix
PORT=3000 # Web server port
```

## 📸 Preview

https://cdn.discordapp.com/attachments/1093839336149090413/1385837704490520616/image.png?ex=68578570&is=685633f0&hm=2d5c36c821d5536e4584b4e9252ec8b5d0050b07a60d213de928d9dfb263c6c2&
*Example of a giveaway embed*

## 🤝 Support

Need help? Join our support server:  
[🔗 https://discord.com/invite/9MVAPpfs8D](https://discord.com/invite/9MVAPpfs8D)

**Happy Giveaway Hosting!** 🎊
