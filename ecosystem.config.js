module.exports = {
  apps: [
    {
      name: "custoray_frontend",
      script: "scripts/start-standalone.mjs",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "live",
        PORT: 3037,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
