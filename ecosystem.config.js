module.exports = {
  apps: [
    {
      name: "custoray_frontend_dev",
      script: "scripts/start-standalone.mjs",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "customdev",
        PORT: 3036,
      },
    },
  ],
};
