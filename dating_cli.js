#!/usr/bin/env node

const io = require("socket.io-client");
const readline = require("readline");
const chalk = require("chalk");
const { exec } = require("child_process");

// Configuration
const SERVER_URL =
  "https://a2b6-2a02-2455-8564-400-cbf-519c-fcfd-6311.ngrok-free.app";

class DatingCLI {
  constructor() {
    this.socket = null;
    this.username = null;
    this.rl = null;
    this.connected = false;
  }

  async start() {
    console.log(chalk.magenta.bold("💕 Welcome to Dating CLI Chat! 💕"));
    console.log(chalk.gray("Connecting to server..."));

    // Get username
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.username = await this.getUsername();

    // Connect to server
    this.socket = io(SERVER_URL);

    this.setupSocketEvents();
    this.setupInput();
  }

  async getUsername() {
    return new Promise((resolve) => {
      this.rl.question(chalk.cyan("Enter your username: "), (username) => {
        resolve(username.trim() || `User${Math.floor(Math.random() * 1000)}`);
      });
    });
  }

  setupSocketEvents() {
    this.socket.on("connect", () => {
      console.log(chalk.green("✓ Connected to server!"));
      this.connected = true;
      this.socket.emit("join", this.username);
      this.showHelp();
    });

    this.socket.on("disconnect", () => {
      console.log(chalk.red("✗ Disconnected from server"));
      this.connected = false;
    });

    this.socket.on("system_message", (data) => {
      console.log(chalk.yellow(`📢 ${data.message}`));
    });

    this.socket.on("message", (data) => {
      const timestamp = new Date(data.timestamp).toLocaleTimeString();
      // Only show messages from other users, not our own
      if (data.username !== this.username) {
        console.log(
          chalk.white(
            `[${timestamp}] ${chalk.bold(data.username)}: ${data.message}`,
          ),
        );
        exec("afplay /System/Library/Sounds/Ping.aiff");
      }
    });

    this.socket.on("user_joined", (data) => {
      console.log(chalk.green(`👋 ${data.message}`));
    });

    this.socket.on("user_left", (data) => {
      console.log(chalk.red(`👋 ${data.message}`));
    });

    this.socket.on("users_list", (users) => {
      console.log(
        chalk.cyan(
          `\n👥 Currently online: ${users.map((u) => u.username).join(", ")}\n`,
        ),
      );
    });

    this.socket.on("typing", (data) => {
      if (data.isTyping) {
        console.log(chalk.gray(`${data.username} is typing...`));
      }
    });

    this.socket.on("connect_error", (error) => {
      console.log(
        chalk.red(
          "❌ Connection failed. Make sure the server is running on port 3000",
        ),
      );
      process.exit(1);
    });
  }

  setupInput() {
    this.rl.on("line", (input) => {
      const message = input.trim();

      if (!message) return;

      // Clear the input line to avoid duplication
      process.stdout.write("\x1B[1A\x1B[2K"); // Move up one line and clear it

      // Handle commands
      if (message.startsWith("/")) {
        this.handleCommand(message);
      } else {
        // Send regular message
        if (this.connected) {
          this.socket.emit("message", { message });
          // Show our own message immediately
          const timestamp = new Date().toLocaleTimeString();
          console.log(chalk.blue(`[${timestamp}] You: ${message}`));
        } else {
          console.log(chalk.red("Not connected to server"));
        }
      }
    });

    // Handle Ctrl+C
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\n👋 Goodbye!"));
      if (this.socket) {
        this.socket.disconnect();
      }
      process.exit(0);
    });
  }

  handleCommand(command) {
    const args = command.split(" ");
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case "/help":
        this.showHelp();
        break;
      case "/quit":
      case "/exit":
        console.log(chalk.yellow("👋 Goodbye!"));
        this.socket.disconnect();
        process.exit(0);
        break;
      case "/users":
        this.socket.emit("get_users");
        break;
      case "/clear":
        console.clear();
        break;
      default:
        console.log(chalk.red(`Unknown command: ${cmd}`));
        this.showHelp();
    }
  }

  showHelp() {
    console.log(chalk.cyan("\n📋 Available commands:"));
    console.log(chalk.gray("  /help    - Show this help message"));
    console.log(chalk.gray("  /users   - Show online users"));
    console.log(chalk.gray("  /clear   - Clear the screen"));
    console.log(chalk.gray("  /quit    - Exit the chat"));
    console.log(chalk.gray("  Just type a message and press Enter to chat!"));
    console.log(chalk.gray("  Press Ctrl+C to exit\n"));
  }
}

// Start the CLI
const cli = new DatingCLI();
cli.start().catch(console.error);
